import mongoose from 'mongoose'
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
    .find({ 'metadata.leaf': true }).batchSize(10)
    .populate<{ climbs: ClimbType[] }>({ path: 'climbs', model: getClimbModel() })
    .allowDiskUse(true)

  // Calculate stats and bbox
  // Todo: bbox should be calculate when we insert a crag or change their coordinate
  for await (const crag of iterator) {
    const node: AreaMongoType = crag
    node.aggregate = aggregateCragStats(crag.toObject())
    node.metadata.bbox = bboxFrom(node.metadata.lnglat)
    await node.save()
  }
}
