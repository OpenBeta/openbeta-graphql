import { geometry, Point } from '@turf/helpers'
import muuid, { MUUID } from 'uuid-mongodb'
import { v5 as uuidv5, NIL } from 'uuid'
import mongoose, { ClientSession } from 'mongoose'
import { produce } from 'immer'
import isoCountries from 'i18n-iso-countries'
import enJson from 'i18n-iso-countries/langs/en.json' assert { type: 'json' }

import { AreaType, AreaEditableFieldsType, OperationType } from '../db/AreaTypes.js'
import AreaDataSource from './AreaDataSource.js'
import { createRootNode, getUUID } from '../db/import/usa/AreaTree.js'
import { makeDBArea } from '../db/import/usa/AreaTransformer.js'
import { changelogDataSource } from './ChangeLogDataSource.js'
import { ChangeRecordMetadataType } from '../db/ChangeLogType.js'
import CountriesLngLat from '../data/countries-with-lnglat.json' assert { type: 'json' }
import { logger } from '../logger.js'

isoCountries.registerLocale(enJson)

export default class MutableAreaDataSource extends AreaDataSource {
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

  /**
   * Add a new area.  Either a parent id or country code is required.
   * @param user
   * @param areaName
   * @param parentUuid
   * @param countryCode
   */
  async addArea (user: MUUID, areaName: string, parentUuid: MUUID | null, countryCode?: string): Promise<AreaType | null> {
    if (parentUuid == null && countryCode == null) {
      throw new Error('Adding area failed. Must provide parent Id or country code')
    }

    let uuid: MUUID
    if (parentUuid != null) {
      uuid = parentUuid
    } else if (countryCode != null) {
      uuid = countryCode2Uuid(countryCode)
    }

    const session = await this.areaModel.startSession()

    let ret: AreaType | null = null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addArea(session, user, areaName, uuid)
        return ret
      })
    return ret
  }

  async _addArea (session, user: MUUID, areaName: string, parentUuid: MUUID): Promise<any> {
    const parentFilter = { 'metadata.area_id': parentUuid }
    const parent = await this.areaModel.findOne(parentFilter).session(session)

    if (parent == null) {
      throw new Error('Adding area failed.  Expecting 1 parent, found none.')
    }

    const change = await changelogDataSource.create(session, user, OperationType.addArea)
    const newChangeMeta: ChangeRecordMetadataType = {
      user,
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
    newArea.metadata.lnglat = parent.metadata.lnglat
    newArea._change = produce(newChangeMeta, draft => {
      draft.seq = 1
    })
    const rs1 = await this.areaModel.insertMany(newArea, { session })

    // Make sure parent knows about this new area
    parent.children.push(newArea._id)
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

    const area = await this.areaModel.findOne(filter).session(session).lean()

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
          '_change.prevHistoryId': '$_change.historyId',
          _change: produce(_change, draft => {
            draft.seq = 0
            // draft.updatedAt = Date.now()
          })
        }
      }]
      , {
        timestamps: false
      }).orFail().session(session)

    // In order to be able to record the deleted document in area_history, we mark (update) the
    // document for deletion (set ttl index = now).
    // See https://www.mongodb.com/community/forums/t/change-stream-fulldocument-on-delete/15963
    // Mongo TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
    return await this.areaModel.findOneAndUpdate(
      { 'metadata.area_id': uuid },
      [{
        $set: {
          _deleting: new Date(), // TTL index = now
          '_change.prevHistoryId': '$_change.historyId',
          _change: produce(_change, draft => {
            draft.seq = 1
            // draft.updatedAt = Date.now()
          })
        }
      }], {
        timestamps: false,
        returnOriginal: true
      }).session(session).lean()
  }

  /**
   * Update one or more area fields.
   *
   * *Note*: Users may not update country name and short code.
   * @param user
   * @param areaUuid Area uuid to be updated
   * @param document New fields
   * @returns Newly updated area
   */
  async updateArea (user: MUUID, areaUuid: MUUID, document: AreaEditableFieldsType): Promise<AreaType | null> {
    const _updateArea = async (session: ClientSession, user: MUUID, areaUuid: MUUID, document: AreaEditableFieldsType): Promise<any> => {
      const filter = {
        'metadata.area_id': areaUuid,
        deleting: { $ne: null }
      }
      const area = await this.areaModel.findOne(filter).session(session)

      if (area == null) {
        throw new Error('Area update error.  Reason: area not found.')
      }

      const { areaName, description, shortCode, isDestination, lat, lng } = document

      if (area.pathTokens.length === 1) {
        if (areaName != null || shortCode != null) throw new Error('Area update error.  Reason: updating country name or short code is not allowed.')
      }

      if (areaName != null) area.set({ area_name: areaName })
      if (description != null) area.set({ 'content.description': description })
      if (shortCode != null) area.set({ shortCode: shortCode.toUpperCase() })
      if (isDestination != null) area.set({ 'metadata.isDestination': isDestination })

      if (lat != null && lng != null) { // we should already validate lat,lng before in GQL layer
        area.set({
          'metadata.lnglat': geometry('Point', [lng, lat])
        })
      }

      const opType = OperationType.updateArea
      const change = await changelogDataSource.create(session, user, opType)

      const _change: ChangeRecordMetadataType = {
        user,
        historyId: change._id,
        prevHistoryId: area._change?.historyId._id,
        operation: opType,
        seq: 0
      }
      area.set({ _change })
      const cursor = await area.save()
      return cursor.toObject()
    }

    const session = await this.areaModel.startSession()
    let ret: AreaType | null = null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async session => {
        ret = await _updateArea(session, user, areaUuid, document)
        return ret
      })
    return ret
  }
}

export const newAreaHelper = (areaName: string, parentAncestors: string, parentPathTokens: string[], parentGradeContext: string): AreaType => {
  const _id = new mongoose.Types.ObjectId()
  const uuid = getUUID(parentPathTokens.join() + areaName, false, undefined)

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
      lnglat: geometry('Point', [0, 0]) as Point,
      bbox: [-180, -90, 180, 90],
      left_right_index: -1,
      ext_id: ''
    },
    ancestors: ancestors,
    climbs: [],
    pathTokens: pathTokens,
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
    throw new Error('Invalid country code.  Expect alpha2 or alpha3')
  }
  const alpha3 = code.length === 2 ? isoCountries.toAlpha3(code) : code
  return muuid.from(uuidv5(alpha3.toUpperCase(), NIL))
}
