import bbox2Polygon from '@turf/bbox-polygon'
import { geometry, Point } from '@turf/helpers'
import { UserInputError } from 'apollo-server-express'
import isoCountries from 'i18n-iso-countries'
import enJson from 'i18n-iso-countries/langs/en.json' assert {type: 'json'}
import { produce } from 'immer'
import mongoose, { ClientSession } from 'mongoose'
import { NIL, v5 as uuidv5 } from 'uuid'
import muuid, { MUUID } from 'uuid-mongodb'

import { GradeContexts } from '../GradeUtils.js'
import CountriesLngLat from '../data/countries-with-lnglat.json' assert {type: 'json'}
import {
  AreaDocumnent,
  AreaEditableFieldsType,
  AreaType,
  OperationType,
  UpdateSortingOrderType
} from '../db/AreaTypes.js'
import { ChangeRecordMetadataType } from '../db/ChangeLogType.js'
import { ExperimentalAuthorType } from '../db/UserTypes.js'
import { makeDBArea } from '../db/import/usa/AreaTransformer.js'
import { createRootNode } from '../db/import/usa/AreaTree.js'
import { leafReducer, nodesReducer, StatsSummary } from '../db/utils/jobs/TreeUpdaters/updateAllAreas.js'
import { bboxFrom } from '../geo-utils.js'
import { logger } from '../logger.js'
import { createInstance as createExperimentalUserDataSource } from '../model/ExperimentalUserDataSource.js'
import { sanitizeStrict } from '../utils/sanitize.js'
import AreaDataSource from './AreaDataSource.js'
import { changelogDataSource } from './ChangeLogDataSource.js'
import { withTransaction } from '../utils/helpers'

isoCountries.registerLocale(enJson)

export interface AddAreaOptions {
  user: MUUID
  areaName: string
  parentUuid?: MUUID | null
  countryCode?: string
  experimentalAuthor?: ExperimentalAuthorType
  isLeaf?: boolean
  isBoulder?: boolean
  session?: ClientSession
}

export interface UpdateAreaOptions {
  user: MUUID
  areaUuid: MUUID
  document: AreaEditableFieldsType
  session?: ClientSession
}

export default class MutableAreaDataSource extends AreaDataSource {
  experimentalUserDataSource = createExperimentalUserDataSource()

  async setDestinationFlag (user: MUUID, uuid: MUUID, flag: boolean): Promise<AreaType | null> {
    const session = await this.areaModel.startSession()
    let ret: AreaType | null = null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._setDestinationFlag(session, user, uuid, flag)
        return ret
      })
    return ret
  }

  async _setDestinationFlag (session, user: MUUID, uuid: MUUID, flag: boolean): Promise<AreaType> {
    const change = await changelogDataSource.create(session, uuid, OperationType.updateDestination)

    const filter = { 'metadata.area_id': uuid }
    const update: Pick<AreaType, '_change' & { metadata: Pick<AreaType['metadata'], 'isDestination'> }> = [{
      $set: {
        'metadata.isDestination': flag,
        _change: {
          user,
          prevHistoryId: '$_change.historyId',
          historyId: change._id,
          operation: OperationType.updateDestination,
          updatedAt: Date.now()
        }
      }
    }]
    const opts = { new: true, session, timestamps: false } // return newly updated doc
    return await this.areaModel
      .updateOne(filter, update, opts).orFail().lean()
  }

  /**
   * Add a country
   * @param _countryCode alpha2 or 3 ISO code
   */
  async addCountry (_countryCode: string): Promise<AreaType> {
    const countryCode = _countryCode.toLocaleUpperCase('en-US')
    if (!isoCountries.isValid(countryCode)) {
      throw new Error('Invalid ISO code: ' + countryCode)
    }

    // Country code can be either alpha2 or 3. Let's convert it to alpha3.
    const alpha3 = countryCode.length === 2 ? isoCountries.toAlpha3(countryCode) : countryCode
    const countryName = isoCountries.getName(countryCode, 'en')
    const countryNode = createRootNode(alpha3, countryName)

    // Build the Mongo document to be inserted
    const doc = makeDBArea(countryNode)
    doc.shortCode = alpha3

    // Look up the country lat,lng
    const entry = CountriesLngLat[alpha3]
    if (entry != null) {
      doc.metadata.lnglat = {
        type: 'Point',
        coordinates: entry.lnglat
      }
    } else {
      // account for a few new/unofficial countries without lat,lng in the lookup table
      logger.warn(`Missing lnglat for ${countryName}`)
    }

    const rs = await this.areaModel.insertMany(doc)
    if (rs.length === 1) {
      return await rs[0].toObject()
    }
    throw new Error('Error inserting ' + countryCode)
  }

  async addAreaWith ({
    user,
    areaName,
    parentUuid = null,
    countryCode,
    experimentalAuthor,
    isLeaf,
    isBoulder,
    session
  }: AddAreaOptions): Promise<AreaType> {
    return await this.addArea(user, areaName, parentUuid, countryCode, experimentalAuthor, isLeaf, isBoulder, session)
  }

  /**
   * Add a new area.  Either a parent id or country code is required.
   * @param user
   * @param areaName
   * @param parentUuid
   * @param countryCode
   */
  async addArea (user: MUUID,
    areaName: string,
    parentUuid: MUUID | null,
    countryCode?: string,
    experimentalAuthor?: ExperimentalAuthorType,
    isLeaf?: boolean,
    isBoulder?: boolean,
    sessionCtx?: ClientSession): Promise<AreaType> {
    if (parentUuid == null && countryCode == null) {
      throw new Error(`Adding area "${areaName}" failed. Must provide parent Id or country code`)
    }

    let parentId: MUUID
    if (parentUuid != null) {
      parentId = parentUuid
    } else if (countryCode != null) {
      parentId = countryCode2Uuid(countryCode)
    } else {
      throw new Error(`Adding area "${areaName}" failed. Unable to determine parent id or country code`)
    }

    const session = sessionCtx ?? await this.areaModel.startSession()
    try {
      if (session.inTransaction()) {
        return await this._addArea(session, user, areaName, parentId, experimentalAuthor, isLeaf, isBoulder)
      } else {
        return await withTransaction(session, async () => await this._addArea(session, user, areaName, parentId, experimentalAuthor, isLeaf, isBoulder))
      }
    } finally {
      if (sessionCtx == null) {
        await session.endSession()
      }
    }
  }

  async _addArea (session, user: MUUID, areaName: string, parentUuid: MUUID, experimentalAuthor?: ExperimentalAuthorType, isLeaf?: boolean, isBoulder?: boolean): Promise<any> {
    const parentFilter = { 'metadata.area_id': parentUuid }
    const parent = await this.areaModel.findOne(parentFilter).session(session).orFail(new UserInputError(`[${areaName}]: Expecting country or area parent, found none with id ${parentUuid.toString()}`))

    if (parent.metadata.leaf || (parent.metadata?.isBoulder ?? false)) {
      if (parent.children.length > 0 || parent.climbs.length > 0) {
        throw new UserInputError(`[${areaName}]: Adding new areas to a leaf or boulder area is not allowed.`)
      }
      // No children.  It's ok to continue turning an empty crag/boulder into an area.
      parent.metadata.leaf = false
      parent.metadata.isBoulder = false
    }

    // See https://github.com/OpenBeta/openbeta-graphql/issues/244
    let experimentaAuthorId: MUUID | null = null
    if (experimentalAuthor != null) {
      experimentaAuthorId = await this.experimentalUserDataSource.updateUser(session, experimentalAuthor.displayName, experimentalAuthor.url)
    }

    const change = await changelogDataSource.create(session, user, OperationType.addArea)
    const newChangeMeta: ChangeRecordMetadataType = {
      user: experimentaAuthorId ?? user,
      historyId: change._id,
      operation: OperationType.addArea,
      seq: 0
    }

    parent._change = produce(newChangeMeta, draft => {
      draft.seq = 0
      draft.prevHistoryId = parent._change?.historyId
    })

    const parentAncestors = parent.ancestors
    const parentPathTokens = parent.pathTokens
    const parentGradeContext = parent.gradeContext
    const newArea = newAreaHelper(areaName, parentAncestors, parentPathTokens, parentGradeContext)
    if (isLeaf != null) {
      newArea.metadata.leaf = isLeaf
    }
    if (isBoulder != null) {
      if (isBoulder) {
        // a boulder is also a leaf area
        newArea.metadata.leaf = true
        newArea.metadata.isBoulder = true
      } else {
        newArea.metadata.isBoulder = false
      }
    }
    newArea.metadata.lnglat = parent.metadata.lnglat
    newArea.createdBy = experimentaAuthorId ?? user
    newArea._change = produce(newChangeMeta, draft => {
      draft.seq = 1
    })
    const rs1 = await this.areaModel.insertMany(newArea, { session })

    // Make sure parent knows about this new area
    parent.children.push(newArea._id)
    parent.updatedBy = experimentaAuthorId ?? user
    await parent.save({ timestamps: false })
    return rs1[0].toObject()
  }

  async deleteArea (user: MUUID, uuid: MUUID): Promise<AreaType | null> {
    const session = await this.areaModel.startSession()
    let ret: AreaType | null = null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async session => {
        ret = await this._deleteArea(session, user, uuid)
        return ret
      })
    return ret
  }

  async _deleteArea (session: ClientSession, user: MUUID, uuid: MUUID): Promise<any> {
    const filter = {
      'metadata.area_id': uuid,
      deleting: { $ne: null }
    }

    const area = await this.areaModel.findOne(filter).session(session).orFail()

    if (area == null) {
      throw new Error('Delete area error.  Reason: area not found.')
    }

    if (area?.children?.length > 0) {
      throw new Error('Delete area error.  Reason: subareas not empty.')
    }

    if (area?.climbs?.length > 0) {
      throw new Error('Delete area error.  Reason: climbs not empty.')
    }

    const change = await changelogDataSource.create(session, user, OperationType.deleteArea)

    const _change: ChangeRecordMetadataType = {
      user,
      historyId: change._id,
      operation: OperationType.deleteArea,
      seq: 0
    }
    // Remove this area id from the parent.children[]
    await this.areaModel.updateOne(
      {
        children: area._id
      },
      [{
        $set: {
          children: {
            $filter: {
              input: '$children',
              as: 'child',
              cond: { $ne: ['$$child', area._id] }
            }
          },
          updatedBy: user,
          '_change.prevHistoryId': '$_change.historyId',
          _change: produce(_change, draft => {
            draft.seq = 0
          })
        }
      }]
      , {
        timestamps: false
      }).orFail().session(session)

    await this.updateLeafStatsAndGeoData(session, _change, area, true)

    // In order to be able to record the deleted document in area_history, we mark (update) the
    // document for deletion (set ttl index = now).
    // See https://www.mongodb.com/community/forums/t/change-stream-fulldocument-on-delete/15963
    // Mongo TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
    return await this.areaModel.findOneAndUpdate(
      { 'metadata.area_id': uuid },
      [{
        $set: {
          updatedBy: user,
          _deleting: new Date(), // TTL index = now
          '_change.prevHistoryId': '$_change.historyId',
          _change: produce(_change, draft => {
            draft.seq = 1
          })
        }
      }], {
        timestamps: false,
        returnOriginal: true
      }).session(session).lean()
  }

  async updateAreaWith ({ user, areaUuid, document, session }: UpdateAreaOptions): Promise<AreaType | null> {
    return await this.updateArea(user, areaUuid, document, session)
  }

  /**
   * Update one or more area fields.
   *
   * *Note*: Users may not update country name and short code.
   * @param user
   * @param areaUuid Area uuid to be updated
   * @param document New fields
   * @param sessionCtx optional existing session to use for the transactions
   * @returns Newly updated area
   */
  async updateArea (user: MUUID, areaUuid: MUUID, document: AreaEditableFieldsType, sessionCtx?: ClientSession): Promise<AreaType | null> {
    const _updateArea = async (session: ClientSession, user: MUUID, areaUuid: MUUID, document: AreaEditableFieldsType): Promise<any> => {
      const filter = {
        'metadata.area_id': areaUuid,
        deleting: { $ne: null }
      }
      const area = await this.areaModel.findOne(filter).session(session)

      if (area == null) {
        throw new Error(`Area update error. Reason: Area with id ${areaUuid.toString()} not found.`)
      }

      const {
        areaName,
        description,
        shortCode,
        isDestination,
        isLeaf,
        isBoulder,
        lat,
        lng,
        experimentalAuthor
      } = document

      // See https://github.com/OpenBeta/openbeta-graphql/issues/244
      let experimentalAuthorId: MUUID | null = null
      if (experimentalAuthor != null) {
        experimentalAuthorId = await this.experimentalUserDataSource.updateUser(session, experimentalAuthor.displayName, experimentalAuthor.url)
      }

      const opType = OperationType.updateArea
      const change = await changelogDataSource.create(session, user, opType)

      const _change: ChangeRecordMetadataType = {
        user: experimentalAuthorId ?? user,
        historyId: change._id,
        prevHistoryId: area._change?.historyId._id,
        operation: opType,
        seq: 0
      }
      area.set({ _change })
      area.updatedBy = experimentalAuthorId ?? user

      if (area.pathTokens.length === 1) {
        if (areaName != null || shortCode != null) throw new Error(`[${area.area_name}]: Area update error. Reason: Updating country name or short code is not allowed.`)
      }

      if (area.children.length > 0 && (isLeaf != null || isBoulder != null)) {
        throw new Error(`[${area.area_name}]: Area update error.  Reason: Updating leaf or boulder status of an area with subareas is not allowed.`)
      }

      if (areaName != null) {
        const sanitizedName = sanitizeStrict(areaName)
        area.set({ area_name: sanitizedName })

        // change our pathTokens
        await this.updatePathTokens(session, _change, area, sanitizedName)
      }

      if (shortCode != null) area.set({ shortCode: shortCode.toUpperCase() })
      if (isDestination != null) area.set({ 'metadata.isDestination': isDestination })
      if (isLeaf != null) area.set({ 'metadata.leaf': isLeaf })
      if (isBoulder != null) {
        area.set({ 'metadata.isBoulder': isBoulder })
        if (isBoulder) {
          // boulder == true implies leaf = true
          area.set({ 'metadata.leaf': true })
        }
      }
      if (description != null) {
        const sanitized = sanitizeStrict(description)
        area.set({ 'content.description': sanitized })
      }

      const latLngHasChanged = lat != null && lng != null
      if (latLngHasChanged) { // we should already validate lat,lng before in GQL layer
        const point = geometry('Point', [lng, lat]) as Point
        area.set({
          'metadata.lnglat': point
        })
        if (area.metadata.leaf || (area.metadata?.isBoulder ?? false)) {
          const bbox = bboxFrom(point)
          area.set({
            'metadata.bbox': bbox,
            'metadata.polygon': bbox == null ? undefined : bbox2Polygon(bbox).geometry
          })
          await this.updateLeafStatsAndGeoData(session, _change, area)
        }
      }

      const cursor = await area.save()
      return cursor.toObject()
    }

    const session = sessionCtx ?? await this.areaModel.startSession()
    try {
      if (session.inTransaction()) {
        return await _updateArea(session, user, areaUuid, document)
      } else {
        return await withTransaction(session, async () => await _updateArea(session, user, areaUuid, document))
      }
    } finally {
      if (sessionCtx == null) {
        await session.endSession()
      }
    }
  }

  /**
   * Update path tokens
   * @param session Mongoose session
   * @param changeRecord Changeset metadata
   * @param area area to update
   * @param newAreaName new area name
   * @param depth tree depth
   */
  async updatePathTokens (session: ClientSession, changeRecord: ChangeRecordMetadataType, area: AreaDocumnent, newAreaName: string, changeIndex: number = -1): Promise<void> {
    if (area.pathTokens.length > 1) {
      if (changeIndex === -1) {
        changeIndex = area.pathTokens.length - 1
      }

      const newPath = [...area.pathTokens]
      newPath[changeIndex] = newAreaName
      area.set({ pathTokens: newPath })
      area.set({ _change: changeRecord })
      await area.save({ session })

      // hydrate children_ids array with actual area documents
      await area.populate('children')

      await Promise.all(area.children.map(async childArea => {
        // TS complains about ObjectId type
        // Fix this when we upgrade Mongoose library
        // @ts-expect-error
        await this.updatePathTokens(session, changeRecord, childArea, newAreaName, changeIndex)
      }))
    }
  }

  /**
   *
   * @param user user id
   * @param input area sorting input array
   * @returns
   */
  async updateSortingOrder (user: MUUID, input: UpdateSortingOrderType[]): Promise<string[] | null> {
    const doUpdate = async (session: ClientSession, user: MUUID, input: UpdateSortingOrderType[]): Promise<string[]> => {
      const opType = OperationType.orderAreas
      const change = await changelogDataSource.create(session, user, opType)
      const updates: any[] = []

      input.forEach(({ areaId, leftRightIndex }, index) => {
        updates.push({
          updateOne: {
            filter: { 'metadata.area_id': muuid.from(areaId) },
            update: {
              $set: {
                'metadata.leftRightIndex': leftRightIndex,
                updatedBy: user,
                _change: {
                  user,
                  historyId: change._id,
                  operation: opType,
                  seq: index
                }
              }
            }
          }
        })
      })

      const rs = (await this.areaModel.bulkWrite(updates, { session })).toJSON()

      if (rs.ok === 1 && rs.nMatched === rs.nModified) {
        return input.map(item => item.areaId)
      } else {
        throw new Error(`Expect to update ${input.length} areas but found ${rs.nMatched}.`)
      }
    }

    const session = await this.areaModel.startSession()
    let ret: string[] | null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await doUpdate(session, user, input)
        return ret
      })
    // @ts-expect-error
    return ret
  }

  /**
   * Update area stats and geo data for a given leaf node and its ancestors.
   * @param session
   * @param changeRecord
   * @param startingArea
   * @param excludeStartingArea true to exlude the starting area from the update. Useful when deleting an area.
   */
  async updateLeafStatsAndGeoData (session: ClientSession, changeRecord: ChangeRecordMetadataType, startingArea: AreaDocumnent, excludeStartingArea: boolean = false): Promise<void> {
    /**
     * Update function.  For each node, recalculate stats and recursively update its acenstors until we reach the country node.
     */
    const updateFn = async (session: ClientSession, changeRecord: ChangeRecordMetadataType, area: AreaDocumnent, childSummary?: StatsSummary): Promise<void> => {
      if (area.pathTokens.length <= 1) {
        // we're at the root country node
        return
      }

      const ancestors = area.ancestors.split(',')
      const parentUuid = muuid.from(ancestors[ancestors.length - 2])
      const parentArea =
        await this.areaModel.findOne({ 'metadata.area_id': parentUuid })
          .batchSize(10)
          .populate<{ children: AreaDocumnent[] }>({ path: 'children', model: this.areaModel })
          .allowDiskUse(true)
          .session(session)
          .orFail()

      const acc: StatsSummary[] = []
      /**
       * Collect existing stats from all children. For affected node, use the stats from previous calculation.
       */
      for (const childArea of parentArea.children) {
        if (childArea._id.equals(area._id)) {
          if (childSummary != null) acc.push(childSummary)
        } else {
          acc.push(leafReducer(childArea.toObject()))
        }
      }

      const current = await nodesReducer(acc, parentArea as any as AreaDocumnent, { session, changeRecord })
      await updateFn(session, changeRecord, parentArea as any as AreaDocumnent, current)
    }

    /**
     * Begin calculation
     */
    if (!startingArea.metadata.leaf && !(startingArea.metadata.isBoulder ?? false)) {
      return
    }
    if (excludeStartingArea) {
      await updateFn(session, changeRecord, startingArea)
    } else {
      const leafStats = leafReducer(startingArea.toObject())
      await updateFn(session, changeRecord, startingArea, leafStats)
    }
  }

  static instance: MutableAreaDataSource

  static getInstance (): MutableAreaDataSource {
    if (MutableAreaDataSource.instance == null) {
      MutableAreaDataSource.instance = new MutableAreaDataSource(mongoose.connection.db.collection('areas'))
    }
    return MutableAreaDataSource.instance
  }
}

export const newAreaHelper = (areaName: string, parentAncestors: string, parentPathTokens: string[], parentGradeContext: GradeContexts): AreaType => {
  const _id = new mongoose.Types.ObjectId()
  const uuid = genMUIDFromPaths(parentPathTokens, areaName)

  const pathTokens = produce(parentPathTokens, draft => {
    draft.push(areaName)
  })

  const ancestors = parentAncestors + ',' + uuid.toUUID().toString()
  return {
    _id,
    shortCode: '',
    area_name: areaName,
    children: [],
    metadata: {
      isDestination: false,
      leaf: false,
      area_id: uuid,
      leftRightIndex: -1,
      ext_id: '',
      bbox: undefined,
      polygon: undefined
    },
    ancestors,
    climbs: [],
    pathTokens,
    gradeContext: parentGradeContext,
    aggregate: {
      byGrade: [],
      byDiscipline: {},
      byGradeBand: {
        unknown: 0,
        beginner: 0,
        intermediate: 0,
        advanced: 0,
        expert: 0
      }
    },
    density: 0,
    totalClimbs: 0,
    content: {
      description: ''
    }
  }
}

export const countryCode2Uuid = (code: string): MUUID => {
  if (!isoCountries.isValid(code)) {
    throw new Error(`Invalid country code: ${code}. Expect alpha2 or alpha3`)
  }
  const alpha3 = code.length === 2 ? isoCountries.toAlpha3(code) : code
  return muuid.from(uuidv5(alpha3.toUpperCase(), NIL))
}

/**
 * Generate a stable UUID from a list of paths. Example: `Canada|Squamish => 8f623793-c2b2-59e0-9e64-d167097e3a3d`
 * @param parentPathTokens Ancestor paths
 * @param thisPath Current area
 * @returns MUUID
 */
export const genMUIDFromPaths = (parentPathTokens: string[], thisPath: string): MUUID => {
  const keys = parentPathTokens.slice() // clone array
  keys.push(thisPath)
  return muuid.from(uuidv5(keys.join('|').toUpperCase(), NIL))
}
