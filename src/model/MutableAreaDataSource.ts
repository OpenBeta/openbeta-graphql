import { geometry, Point } from '@turf/helpers'
import { MUUID } from 'uuid-mongodb'
import mongoose, { ClientSession } from 'mongoose'
import { produce } from 'immer'

import { AreaType, OperationType } from '../db/AreaTypes'
import AreaDataSource from './AreaDataSource'
import { createRootNode, getUUID } from '../db/import/usa/AreaTree'
import { makeDBArea } from '../db/import/usa/AreaTransformer'
import { changelogDataSource } from './ChangeLogDataSource'
import { ChangeRecordMetadataType } from '../db/ChangeLogType'

export default class MutableAreaDataSource extends AreaDataSource {
  async setDestinationFlag (user: MUUID, uuid: MUUID, flag: boolean): Promise<AreaType|null> {
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
    const update: Pick<AreaType, '_change' & { metadata: Pick<AreaType['metadata'], 'isDestination'>}> = {
      'metadata.isDestination': flag,
      _change: {
        user,
        changeId: change._id,
        operation: OperationType.updateDestination,
        updatedAt: Date.now()
      }
    }
    const opts = { new: true, session, timestamps: false } // return newly updated doc
    return await this.areaModel
      .findOneAndUpdate(filter, update, opts).lean()
  }

  async addCountry (user: MUUID, countryCode: string): Promise<AreaType> {
    const session = await this.areaModel.startSession()

    let ret: AreaType

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addCountry(session, user, countryCode)
        return ret
      })
    // @ts-expect-error
    return ret
  }

  async _addCountry (session, user, countryCode: string): Promise<AreaType> {
    const countryNode = createRootNode(countryCode)
    const doc = makeDBArea(countryNode)
    doc.shortCode = countryCode

    const change = await changelogDataSource.create(session, user, OperationType.addCountry)
    doc._change = {
      user,
      changeId: change._id,
      operation: OperationType.addCountry,
      seq: 0
    }
    const rs = await this.areaModel.insertMany(doc, { session })
    return rs[0]
  }

  async addArea (user: MUUID, areaName: string, parentUuid: MUUID): Promise<AreaType | null> {
    const session = await this.areaModel.startSession()

    let ret: AreaType | null = null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addArea(session, user, areaName, parentUuid)
        return ret
      })
    return ret
  }

  async _addArea (session, user: MUUID, areaName: string, parentUuid: MUUID): Promise<any> {
    const parentFilter = { 'metadata.area_id': parentUuid }
    const parent = await this.areaModel.findOne(parentFilter).session(session)

    if (parent == null) {
      throw new Error('Adding area failed.  Expecting 1 parent, found  none.')
    }

    const change = await changelogDataSource.create(session, user, OperationType.addArea)
    const newChange: ChangeRecordMetadataType = {
      user,
      changeId: change._id,
      operation: OperationType.addArea,
      seq: 0
    }

    parent._change = produce(newChange, draft => {
      draft.seq = 0
      draft.createdAt = parent._change?.createdAt
      draft.updatedAt = Date.now()
    })

    const parentAncestors = parent.ancestors
    const parentPathTokens = parent.pathTokens
    const newArea = newAreaHelper(areaName, parentAncestors, parentPathTokens)
    newArea._change = produce(newChange, draft => {
      draft.seq = 1
    })
    const rs1 = await this.areaModel.insertMany(newArea, { session })

    parent.children.push(newArea._id)
    await parent.save({ timestamps: false })
    return rs1[0].toObject()
  }

  async deleteArea (user: MUUID, uuid: MUUID): Promise<AreaType|null> {
    const session = await this.areaModel.startSession()
    let ret: AreaType|null = null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async session => {
        ret = await this._deleteArea(session, user, uuid)
        return ret
      })
    return ret
  }

  async _deleteArea (session: ClientSession, user, uuid: MUUID): Promise<any> {
    const filter = { 'metadata.area_id': uuid }
    const area = await this.areaModel.findOne(filter).session(session).lean()

    if (area == null) {
      throw new Error('Delete area error.  Reason: area not found.')
    }

    if (area?.children?.length > 0) {
      throw new Error('Delete area error.  Reason: subareas not empty.')
    }

    const change = await changelogDataSource.create(session, user, OperationType.deleteArea)

    const _change: ChangeRecordMetadataType = {
      user,
      changeId: change._id,
      operation: OperationType.deleteArea,
      seq: 0
    }
    // Remove this area id from the parent.children[]
    await this.areaModel.updateMany(
      {
        children: [area._id]
      },
      {
        $pullAll: {
          children: [area._id]
        },
        $set: {
          _change: produce(_change, draft => {
            draft.seq = 0
            draft.updatedAt = Date.now()
          })
        }
      }, {
        timestamps: false
      }).session(session)

    // In order to be able to record the deleted document in area_history, we mark (update) the
    // document for deletion (set ttl record = now).
    // See https://www.mongodb.com/community/forums/t/change-stream-fulldocument-on-delete/15963
    // Mongo TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
    return await this.areaModel.findOneAndUpdate(
      { 'metadata.area_id': uuid },
      {
        $set: {
          _deleting: new Date(),
          _change: produce(_change, draft => {
            draft.seq = 1
            draft.updatedAt = Date.now()
          })
        }
      }, {
        timestamps: false
      }).session(session)
  }
}

export const newAreaHelper = (areaName: string, parentAncestors: string, parentPathTokens: string[]): AreaType => {
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
    aggregate: {
      byGrade: [],
      byDiscipline: {},
      byGradeBand: {
        beginner: 0,
        intermediate: 0,
        advance: 0,
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
