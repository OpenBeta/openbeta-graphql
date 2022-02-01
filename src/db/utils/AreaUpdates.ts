import mongoose from 'mongoose'
import { BBox } from '@turf/helpers'
import { getAreaModel } from '../AreaSchema.js'
import { AreaType } from '../AreaTypes.js'
import { bboxFrom, bboxFromList, areaDensity } from '../../geo-utils.js'

type AreaMongoType = mongoose.Document<unknown, any, AreaType> & AreaType

/**
 * Visit all nodes using post-order traversal and perform graph reduction.
 * Conceptually, it's similar to Array.reduce():
 * 1. From root node, recursively visit all children until arrive at leaf nodes (crags).
 * 2. Reduce each leaf node into a single object. Return to parent.
 * 3. Reduce all children results.  Repeat.
 */
export const visitAll = async (): Promise<void> => {
  const areaModel = getAreaModel('areas')

  // Get all top-level country nodes.
  const iterator = areaModel.find({ pathTokens: { $size: 1 } })

  // We only have 1  root (US) right now, but code should run asynchronously
  // for each country
  for await (const root of iterator) {
    await postOrderVisit(root, areaModel)
  }
}

interface ResultType {
  density: number
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
  bbox: bboxFrom([node.metadata.lng, node.metadata.lat]),
  density: 0
})

const nodeReducer = async (result: ResultType[], node: AreaMongoType): Promise<ResultType> => {
  const initial: ResultType = {
    totalClimbs: 0,
    bbox: [-180, -90, 180, 90],
    density: 0
  }
  const z = result.reduce((acc, curr, index) => {
    const { totalClimbs, bbox: _bbox } = curr
    const bbox = index === 0 ? _bbox : bboxFromList([_bbox, acc.bbox])
    return {
      totalClimbs: acc.totalClimbs + totalClimbs,
      bbox,
      density: areaDensity(bbox, totalClimbs)
    }
  }, initial)

  const { totalClimbs, bbox, density } = z
  node.totalClimbs = totalClimbs
  node.metadata.bbox = bbox
  node.density = density
  await node.save()
  return z
}
