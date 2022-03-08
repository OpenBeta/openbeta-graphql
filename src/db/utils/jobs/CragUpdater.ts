import mongoose from 'mongoose'
import { getAreaModel } from '../../AreaSchema.js'
import { AreaType } from '../../AreaTypes.js'
import { aggregateCragStats } from '../Aggregate.js'
import { bboxFrom } from '../../../geo-utils.js'

type AreaMongoType = mongoose.Document<unknown, any, AreaType> & AreaType

/**
 * Run an update operation on all crags (leaf nodes)
 */
export const visitAllCrags = async (): Promise<void> => {
  const areaModel = getAreaModel('areas')

  // Get all crags
  const iterator = areaModel.find({ 'metadata.leaf': true }).allowDiskUse(true)

  for await (const crag of iterator) {
    const node: AreaMongoType = crag
    node.aggregate = aggregateCragStats(crag)
    node.metadata.bbox = bboxFrom(node.metadata.lnglat)
    await node.save()
  }
}
