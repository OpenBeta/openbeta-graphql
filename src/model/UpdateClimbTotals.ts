import mongoose from 'mongoose'
import { BBox } from '@turf/helpers'
import { getAreaModel } from '../db/AreaSchema.js'
import { AreaType } from '../db/AreaTypes.js'
import { bboxFrom, bboxFromList } from '../geo-utils.js'

type AreaMongoType = mongoose.Document<unknown, any, AreaType> & AreaType
/**
 * Visit all nodes
 * @param pathRoot
 */
export const visitAll = async (): Promise<void> => {
  const areaModel = getAreaModel('areas')

  // get all top-level country nodes
  const iterator = areaModel.find({ pathTokens: { $size: 1 } })

  for await (const root of iterator) {
    await postOrderVisit(root, areaModel)
  }
}

interface ResultType {
  totalClimbs: number
  bbox: BBox
}

async function postOrderVisit (node: AreaMongoType, areaModel: mongoose.Model<AreaType>): Promise<ResultType> {
  if (node.metadata.leaf) {
    return leafReducer(node)
  }

  // populate children IDs with actual areas
  const nodeWithSubAreas = await node.populate('children')

  const results = await Promise.all(
    nodeWithSubAreas.children.map(async child => {
      const area: any = child // do this to avoid TS casting error
      return await postOrderVisit(area as AreaMongoType, areaModel)
    })
  )
  return await nodeReducer(results, node)
}

const leafReducer = (node: AreaMongoType): ResultType => ({
  totalClimbs: node.totalClimbs,
  bbox: bboxFrom([node.metadata.lng, node.metadata.lat])
})

const nodeReducer = async (result: ResultType[], node: AreaMongoType): Promise<ResultType> => {
  const initial: ResultType = {
    totalClimbs: 0,
    bbox: [-180, -90, 180, 90]
  }
  const z = result.reduce((acc, curr, index) => {
    const { totalClimbs, bbox: _bbox } = curr
    const bbox = index === 0 ? _bbox : bboxFromList([_bbox, acc.bbox])
    return {
      totalClimbs: acc.totalClimbs + totalClimbs,
      bbox
    }
  }, initial)

  const { totalClimbs, bbox } = z
  node.totalClimbs = totalClimbs
  node.metadata.bbox = bbox
  await node.save()
  return z
}

// async function visitNode (node: AreaMongoType, areaModel: mongoose.Model<AreaType>): Promise<number> {
//   if (node.metadata.leaf) {
//     return node.totalClimbs
//   }

//   // populate children IDs with actual areas
//   const nodeWithSubAreas = await node.populate('children')

//   const z = await Promise.all(
//     nodeWithSubAreas.children.map(async child => {
//       const area: any = child // do this to avoid TS casting error
//       return await visitNode(area as AreaMongoType, areaModel)
//     }))
//   const sum = z.reduce((acc, curr) => acc + curr, 0)
//   node.totalClimbs = sum
//   await node.save()
//   return sum
// }
