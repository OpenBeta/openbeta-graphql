import { geometry, Point } from '@turf/helpers'
import { MUUID } from 'uuid-mongodb'
import mongoose from 'mongoose'

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

  async addArea (areaName: string, parentUuid: MUUID): Promise<AreaType> {
    const parentFilter = { 'metadata.area_id': parentUuid }
    const rs = await this.areaModel.find(parentFilter).limit(1).lean()

    if (rs.length !== 1) {
      throw new Error(`Adding area failed.  Expecting 1 parent, found  + ${rs?.length}`)
    }

    const parentAncestors = rs[0].ancestors
    const parentPathTokens = rs[0].pathTokens
    const newArea = newAreaHelper(areaName, parentAncestors, parentPathTokens)
    const rs1 = await this.areaModel.insertMany(newArea)

    return rs1[0]
  }

  async deleteArea (uuid: MUUID): Promise<any> {
    return await this.areaModel.findOneAndUpdate({ 'metadata.area_id': uuid }, { $set: { _deleting: new Date() } })
  }
}

export const newAreaHelper = (areaName: string, parentAncestors: string, parentPathTokens: string[]): AreaType => {
  const _id = new mongoose.Types.ObjectId()
  const uuid = getUUID(parentPathTokens.join() + areaName, false, undefined)

  parentPathTokens.push(areaName)
  const pathTokens = parentPathTokens

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
