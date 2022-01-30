import mongoose from 'mongoose'
import { getAreaModel } from '../db/AreaSchema.js'
import { AreaType } from '../db/AreaTypes.js'

type AreaMongoType = mongoose.Document<unknown, any, AreaType> & AreaType
/**
 * Use Post-order traversal to update climb total
 * @param pathRoot
 */
export const updateSum = async (): Promise<void> => {
  const areaModel = getAreaModel('areas')

  // get all top-level country nodes
  const iterator = areaModel.find({ pathTokens: { $size: 1 } })

  for await (const root of iterator) {
    await visitNode(root, areaModel)
  }
}

async function visitNode (node: AreaMongoType, areaModel: mongoose.Model<AreaType>): Promise<number> {
  if (node.metadata.leaf) {
    return node.totalClimbs
  }

  // populate children IDs with actual areas
  const nodeWithSubAreas = await node.populate('children')

  const z = await Promise.all(
    nodeWithSubAreas.children.map(async child => {
      const area: any = child // do this to avoid TS casting error
      return await visitNode(area as AreaMongoType, areaModel)
    }))
  const sum = z.reduce((acc, curr) => acc + curr, 0)
  node.totalClimbs = sum
  await node.save()
  return sum
}
