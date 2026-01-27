import mongoose from 'mongoose'
import bbox2Polygon from '@turf/bbox-polygon'

import { getAreaModel } from '../../AreaSchema.js'
import { getClimbModel } from '../../ClimbSchema.js'
import { AreaType } from '../../AreaTypes.js'
import { ClimbType } from '../../ClimbTypes.js'
import { aggregateCragStats } from '../Aggregate.js'
import { bboxFrom } from '../../../geo-utils.js'

type AreaMongoType = mongoose.Document<unknown, any, AreaType> & AreaType

/**
 * Run an update operation on all crags (leaf nodes)
 * Todo: finer-grained data, ie per country?
 */
export const visitAllCrags = async (): Promise<void> => {
  const areaModel = getAreaModel('areas')

  // Get all crags
  const iterator = areaModel
    .find({
      $or: [
        { 'metadata.leaf': true },
        { children: { $exists: true, $size: 0 } }
      ]
    }).batchSize(10)
    .populate<{ climbs: ClimbType[] }>({ path: 'climbs', model: getClimbModel() })
    .allowDiskUse(true)

  // Calculate stats and bbox
  // Todo: bbox should be calculate when we insert a crag or change their coordinate
  for await (const crag of iterator) {
    const node: AreaMongoType = crag
    node.aggregate = aggregateCragStats(crag.toObject())
    const bbox = bboxFrom(node.metadata.lnglat)
    node.metadata.bbox = bbox
    node.metadata.polygon = bbox == null ? undefined : bbox2Polygon(bbox).geometry
    await node.save()
  }
}
