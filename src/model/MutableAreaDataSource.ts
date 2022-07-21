import { geometry, Point } from '@turf/helpers'
import { MUUID } from 'uuid-mongodb'
import mongoose from 'mongoose'
import { produce } from 'immer'

import { AreaType } from '../db/AreaTypes'
import AreaDataSource from './AreaDataSource'
import { createRootNode, getUUID } from '../db/import/usa/AreaTree'
import { makeDBArea } from '../db/import/usa/AreaTransformer'

export default class MutableAreaDataSource extends AreaDataSource {
  // async addArea (area: AreaType): Promise<any> {
  //   return await this.mediaModel.insertMany([area])
  // }

  async addCountry (countryCode: string): Promise<AreaType> {
    const countryNode = createRootNode(countryCode)
    const doc = makeDBArea(countryNode)
    doc.shortCode = countryCode
    const rs = await this.areaModel.insertMany(doc)
    return rs[0]
  }

  async addArea (areaName: string, parentUuid: MUUID): Promise<AreaType | null> {
    const session = await this.areaModel.startSession()

    let ret: AreaType | null = null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addArea(session, areaName, parentUuid)
        return ret
      })
    return ret
  }

  async _addArea (session, areaName: string, parentUuid: MUUID): Promise<any> {
    const parentFilter = { 'metadata.area_id': parentUuid }
    const rs = await this.areaModel.findOne(parentFilter).session(session)

    if (rs == null) {
      throw new Error('Adding area failed.  Expecting 1 parent, found  none.')
    }

    const parentAncestors = rs.ancestors
    const parentPathTokens = rs.pathTokens
    const newArea = newAreaHelper(areaName, parentAncestors, parentPathTokens)
    const rs1 = await this.areaModel.insertMany(newArea, { session })

    rs.children.push(newArea._id)
    await rs.save()

    return rs1[0].toObject()
  }

  async deleteArea (uuid: MUUID): Promise<AreaType|null> {
    const session = await this.areaModel.startSession()
    let ret: AreaType|null = null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async session => {
        ret = await this._deleteArea(session, uuid)
        return ret
      })
    return ret
  }

  async _deleteArea (session, uuid: MUUID): Promise<any> {
    const filter = { 'metadata.area_id': uuid }
    const area = await this.areaModel.findOne(filter).session(session).lean()

    if (area == null) {
      throw new Error('Delete area error.  Reason: area not found.')
    }

    if (area?.children?.length > 0) {
      throw new Error('Delete area error.  Reason: subareas not empty.')
    }

    // Remove this area id from the parent.children[]
    await this.areaModel.updateMany(
      {
        children: [area._id]
      },
      {
        $pullAll: {
          children: [area._id]
        }
      }).session(session)

    // In order to be able to record the deleted document in area_history, we mark (update) the
    // document for deletion (set ttl record = now).
    // See https://www.mongodb.com/community/forums/t/change-stream-fulldocument-on-delete/15963
    // Mongo TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
    return await this.areaModel.findOneAndUpdate(
      { 'metadata.area_id': uuid },
      {
        $set: {
          _deleting: new Date()
        }
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
