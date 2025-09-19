import bbox2Polygon from '@turf/bbox-polygon'
import { geometry, Point } from '@turf/helpers'
import { GraphQLError } from 'graphql'
import { ApolloServerErrorCode } from '@apollo/server/errors'
import isoCountries from 'i18n-iso-countries'
import enJson from 'i18n-iso-countries/langs/en.json' assert {type: 'json'}
import { produce } from 'immer'
import mongoose, { ClientSession } from 'mongoose'
import { NIL, v5 as uuidv5 } from 'uuid'
import muuid, { MUUID } from 'uuid-mongodb'

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
import { leafReducer, nodesReducer, StatsSummary } from '../db/utils/jobs/TreeUpdaters/updateAllAreas.js'
import { bboxFrom } from '../geo-utils.js'
import { logger } from '../logger.js'
import ExperimentalUserDataSource from '../model/ExperimentalUserDataSource.js'
import { sanitizeStrict } from '../utils/sanitize.js'
import AreaDataSource from './AreaDataSource.js'
import ChangeLogDataSource from './ChangeLogDataSource.js'
import { muuidToString, resolveTransaction, withTransaction } from '../utils/helpers.js'
import { getAreaModel } from '../db/AreaSchema.js'
import { AreaRelationsEmbeddings, AreaStructureError } from './AreaRelationsEmbeddings'
import { getCountriesDefaultGradeContext, GradeContexts } from '../GradeUtils'

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

const defaultArea = {
  shortCode: '',
  metadata: {
    isDestination: false,
    leaf: false,
    leftRightIndex: -1,
    ext_id: ''
  },
  climbs: [],
  embeddedRelations: {
    children: []
  },
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

export default class MutableAreaDataSource extends AreaDataSource {
  experimentalUserDataSource = ExperimentalUserDataSource.getInstance()
  relations = new AreaRelationsEmbeddings(this.areaModel)

  private areaNameCompare (name: string): string {
    return name.trim().toLocaleLowerCase().split(' ').filter(i => i !== '').join(' ')
  }

  private async validateUniqueAreaName (areaName: string, parent: AreaType | null): Promise<void> {
    // area names must be unique in a document area structure context, so if the name has changed we need to check
    // that the name is unique for this context
    let neighbours: string[]

    const common = {
      _deleting: { $exists: false }
    }

    if (parent !== null) {
      neighbours = (await this.areaModel.find({ parent: parent._id, ...common })).map(i => i.area_name)
    } else {
      // locate nodes with no direct parent (roots)
      neighbours = (await this.areaModel.find({ parent: { $exists: false }, ...common })).map(i => i.area_name)
    }

    neighbours = neighbours.map(neighbour => this.areaNameCompare(neighbour))
    if (neighbours.includes(this.areaNameCompare(areaName))) {
      throw new AreaStructureError(`[${areaName}]: This name already exists for some other area in this parent`)
    }
  }

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
    const change = await ChangeLogDataSource.getInstance().create(session, uuid, OperationType.updateDestination)

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

    if (alpha3 == null || countryName == null) {
      throw new GraphQLError(`Invalid country code ${countryCode}`)
    }
    const _id = new mongoose.Types.ObjectId()
    const uuid = countryCode2Uuid(countryCode)
    const country: AreaType = {
      ...defaultArea,
      area_name: countryName,
      shortCode: alpha3,
      embeddedRelations: {
        ...defaultArea.embeddedRelations,
        ancestors: [{ _id, uuid, name: countryName }]
      },
      metadata: {
        ...defaultArea.metadata,
        lnglat: CountriesLngLat[alpha3]?.lnglat,
        area_id: uuid
      },
      _id,
      uuid,
      gradeContext: getCountriesDefaultGradeContext()[alpha3] ?? GradeContexts.US
    }

    // Look up the country lat,lng
    const entry = CountriesLngLat[alpha3]

    if (entry != null) {
      country.metadata.lnglat = {
        type: 'Point',
        coordinates: entry.lnglat
      }
    } else {
      // account for a few new/unofficial countries without lat,lng in the lookup table
      logger.warn(`Missing lnglat for ${countryName}`)
    }

    await this.validateUniqueAreaName(countryName, null)

    const rs = await this.areaModel.insertMany(country)
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
    const parent = await this.areaModel.findOne(parentFilter).session(session).orFail(new GraphQLError(`[${areaName}]: Expecting country or area parent, found none with id ${parentUuid.toString()}`, {
      extensions: {
        code: ApolloServerErrorCode.BAD_USER_INPUT
      }
    }))

    if (parent.metadata.leaf || (parent.metadata?.isBoulder ?? false)) {
      if (parent.embeddedRelations.children.length > 0 || parent.climbs.length > 0) {
        throw new GraphQLError(`[${areaName}]: Adding new areas to a leaf or boulder area is not allowed.`, {
          extensions: {
            code: ApolloServerErrorCode.BAD_USER_INPUT
          }
        })
      }
      // No children.  It's ok to continue turning an empty crag/boulder into an area.
      parent.metadata.leaf = false
      parent.metadata.isBoulder = false
    }

    await this.validateUniqueAreaName(areaName, parent)

    // See https://github.com/OpenBeta/openbeta-graphql/issues/244
    let experimentaAuthorId: MUUID | null = null
    if (experimentalAuthor != null) {
      experimentaAuthorId = await this.experimentalUserDataSource.updateUser(session, experimentalAuthor.displayName, experimentalAuthor.url)
    }

    const change = await ChangeLogDataSource.getInstance().create(session, user, OperationType.addArea)
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

    const newArea = this.subAreaHelper(areaName, parent)

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
    if (parent.embeddedRelations.children === null) {
      parent.embeddedRelations.children = [newArea._id]
    } else {
      parent.embeddedRelations.children.push(newArea._id)
    }

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
      _deleting: { $eq: null }
    }

    const area = await this.areaModel.findOne(filter).session(session).orFail()

    if (area == null) {
      throw new Error('Delete area error.  Reason: area not found.')
    }

    if (area?.embeddedRelations.children?.length > 0) {
      throw new Error('Delete area error.  Reason: subareas not empty.')
    }

    if (area?.climbs?.length > 0) {
      throw new Error('Delete area error.  Reason: climbs not empty.')
    }

    const change = await ChangeLogDataSource.getInstance().create(session, user, OperationType.deleteArea)

    const _change: ChangeRecordMetadataType = {
      user,
      historyId: change._id,
      operation: OperationType.deleteArea,
      seq: 0
    }

    // Remove this area id from the parents denormalized children
    await this.areaModel.updateMany(
      { _id: area.parent },
      {
        $pull: { 'embeddedRelations.children': area._id }
      }, {
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
   * Modify an areas parent. This will mutate the areas parent reference, so all of its children
   * will come along with it (Same as if you were to move a directory with files in it to another directory)
   *
   * Note:
   *  If you are a bolder free-soloist than I, you could try and merge this function into the updateArea
   *  function so that parent is a mutable field in the same way that areaName is. However: it is harder.
   *  Simple as that, you will have to deal with substantially more complex effects than simply treating
   *  it as its own sequential operation.
  */
  async setAreaParent (user: MUUID, areaUuid: MUUID, newParent: MUUID, sessionCtx?: ClientSession): Promise<AreaType> {
    if (muuidToString(areaUuid) === muuidToString(newParent)) {
      throw new AreaStructureError('You cannot set self as a parent')
    }

    return await resolveTransaction(this.areaModel, sessionCtx, async (session) => {
      const area = await this.areaModel.findOne({ 'metadata.area_id': areaUuid })
        .orFail()
        .session(session)

      if (area._deleting !== undefined) {
        throw new Error('This area is slated for deletion and cannot be edited')
      }

      if (area.parent === undefined) {
        // This is a root node (country, likely) and so this is an operation with
        // high level privliges that are currently not enumerated.
        throw new AreaStructureError('You cannot migrate, what appears to be, a country.')
      }

      // Retrieve the current parent for this area.
      const oldParent = await this.areaModel.findOne({
        _id: area.parent
      }).lean()
        .session(session)
        .orFail()

      if (muuidToString(oldParent.metadata.area_id) === muuidToString(newParent)) {
        // The request is a no-op, waste no time. nothing has changed
        // we notify the user that this change has already been acknowledged with an error
        // so that we are absolutely clear that nothing has changed.
        throw new AreaStructureError('no-op, the requested parent is ALREADY the parent.')
      }

      const nextParent = await this.areaModel.findOne({ 'metadata.area_id': newParent }).orFail().session(session)

      // We need to validate that a circular reference has not been invoked.
      // Essentially, we cannot specify a parent reference if we have that parent somewhere in our decendants.
      if (
        area.embeddedRelations.children.includes(nextParent._id) ||
        await this.relations.hasDescendent(area._id, nextParent._id, session)
      ) {
        throw new AreaStructureError('CIRCULAR STRUCTURE: The requested parent is already a descendant, and so cannot also be a parent.')
      }

      // the name of the area being moved into this area must be unique in its new context
      await this.validateUniqueAreaName(area.area_name, nextParent)

      // By this point we are satisfied that there are no obvious reasons to reject this request, so we can begin saving
      // and producing effects in the context of this transaction.
      area.parent = nextParent._id

      const change = await ChangeLogDataSource.getInstance().create(session, user, OperationType.changeAreaParent)

      area.set({
        _change: {
          user,
          historyId: change._id,
          prevHistoryId: area._change?.historyId._id,
          operation: OperationType.changeAreaParent,
          seq: 0
        } satisfies ChangeRecordMetadataType,
        updatedBy: user
      })

      await area.save({ session })
      await this.relations.computeEmbeddedAncestors(area, session)
      return await this.areaModel.findById(area._id).orFail()
    })
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
        _deleting: { $eq: null }
      }

      const area = await this.areaModel.findOne(filter).session(session)

      if (area == null) {
        throw new Error(`Area update error. Reason: Area with id ${areaUuid.toString()} not found.`)
      }

      const {
        areaName,
        description,
        areaLocation,
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

      // area names must be unique in a document area structure context, so if the name has changed we need to check
      // that the name is unique for this context
      if (areaName !== undefined && this.areaNameCompare(areaName) !== this.areaNameCompare(area.area_name)) {
        await this.validateUniqueAreaName(areaName, await this.areaModel.findOne({ _id: area.parent }).session(session))
      }

      const opType = OperationType.updateArea
      const change = await ChangeLogDataSource.getInstance().create(session, user, opType)

      const _change: ChangeRecordMetadataType = {
        user: experimentalAuthorId ?? user,
        historyId: change._id,
        prevHistoryId: area._change?.historyId._id,
        operation: opType,
        seq: 0
      }
      area.set({ _change })
      area.updatedBy = experimentalAuthorId ?? user

      // If this is a root area we disallow typical editing of it, as it is likely a country.
      if (area.parent === undefined) {
        if (areaName != null || shortCode != null) throw new Error(`[${area.area_name}]: Area update error. Reason: Updating country name or short code is not allowed.`)
      }

      if (area.embeddedRelations.children.length > 0 && (isLeaf != null || isBoulder != null)) {
        throw new Error(`[${area.area_name}]: Area update error.  Reason: Updating leaf or boulder status of an area with subareas is not allowed.`)
      }

      if (areaName != null) {
        const sanitizedName = sanitizeStrict(areaName)
        area.set({ area_name: sanitizedName })
        // sync names in all relevant references to this area.
        await this.relations.syncNamesInEmbeddings(area, session)
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
      if (areaLocation != null) {
        const sanitized = sanitizeStrict(areaLocation)
        area.set({ 'content.areaLocation': sanitized })
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
   *
   * @param user user id
   * @param input area sorting input array
   * @returns
   */
  async updateSortingOrder (user: MUUID, input: UpdateSortingOrderType[]): Promise<string[] | null> {
    const doUpdate = async (session: ClientSession, user: MUUID, input: UpdateSortingOrderType[]): Promise<string[]> => {
      const opType = OperationType.orderAreas
      const change = await ChangeLogDataSource.getInstance().create(session, user, opType)
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

      const rs = (await this.areaModel.bulkWrite(updates, { session }))

      if (rs.ok === 1 && rs.matchedCount === rs.modifiedCount) {
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

  private subAreaHelper (areaName: string, parent: AreaType): AreaType {
    const _id = new mongoose.Types.ObjectId()
    const uuid = muuid.v4()

    return {
      ...defaultArea,
      _id,
      uuid,
      parent: parent._id,
      area_name: areaName,
      gradeContext: parent.gradeContext,
      metadata: {
        ...defaultArea.metadata,
        area_id: uuid
      },
      embeddedRelations: {
        ...defaultArea.embeddedRelations,
        // Initialize the ancestors by extending the parent's denormalized data
        ancestors: [
          ...parent.embeddedRelations.ancestors,
          {
            _id,
            uuid,
            name: areaName
          }
        ]
      }
    } satisfies AreaType
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
      if (area.parent === undefined) {
        // we're at the root country node
        return
      }

      const parentArea =
        await this.areaModel.findOne({ _id: area.parent })
          .batchSize(10)
          .populate<{ embeddedRelations: { children: AreaDocumnent[] } }>({
          path: 'embeddedRelations.children',
          model: this.areaModel
        })
          .allowDiskUse(true)
          .session(session)
          .orFail()

      const acc: StatsSummary[] = []

      /**
       * Collect existing stats from all children. For affected node, use the stats from previous calculation.
       */
      for (const childArea of parentArea.embeddedRelations.children) {
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
      // @ts-expect-error
      MutableAreaDataSource.instance = new MutableAreaDataSource({ modelOrCollection: getAreaModel() })
    }
    return MutableAreaDataSource.instance
  }
}

export const countryCode2Uuid = (code: string): MUUID => {
  if (!isoCountries.isValid(code)) {
    throw new Error(`Invalid country code: ${code}. Expect alpha2 or alpha3`)
  }
  const alpha3 = code.length === 2 ? isoCountries.toAlpha3(code) : code
  if (alpha3 == null) {
    throw new Error(`Can't find alpha3 for country code: ${code}`)
  }
  return muuid.from(uuidv5(alpha3.toUpperCase(), NIL))
}
