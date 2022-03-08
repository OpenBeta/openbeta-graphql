import mongoose from 'mongoose'
import { BBox } from '@turf/helpers'
import pLimit from 'p-limit'

import { getAreaModel } from '../../AreaSchema.js'
import { AreaType, AggregateType } from '../../AreaTypes.js'
import { bboxFromList, areaDensity } from '../../../geo-utils.js'
import { mergeAggregates } from '../Aggregate.js'

const limiter = pLimit(1000)

type AreaMongoType = mongoose.Document<unknown, any, AreaType> & AreaType
/**
 * Visit all nodes using post-order traversal and perform graph reduction.
 * Conceptually, it's similar to Array.reduce():
 * 1. From root node, recursively visit all children until arrive at leaf nodes (crags).
 * 2. Reduce each leaf node into a single object. Return to parent.
 * 3. Reduce all children results.  Repeat.
 */
export const visitAllAreas = async (): Promise<void> => {
  const areaModel = getAreaModel('areas')

  // Start with 2nd level of tree
  let iterator = areaModel.find({ pathTokens: { $size: 2 } }).allowDiskUse(true)

  for await (const root of iterator) {
    await postOrderVisit(root)
  }

  // Get all top-level country nodes.
  // We only have 1  root (US) right now, but code runs asynchronously
  // for each country
  iterator = areaModel.find({ pathTokens: { $size: 1 } })
  for await (const root of iterator) {
    const stateNodes = await root.populate('children')
    const results = await Promise.all(
      stateNodes.children.map(async entry => {
        const area: any = entry
        return leafReducer(area)
      })
    )
    await nodeReducer(results, root)
  }
}

interface ResultType {
  density: number
  totalClimbs: number
  bbox: BBox
  aggregate: AggregateType
}

async function postOrderVisit (node: AreaMongoType): Promise<ResultType> {
  if (node.metadata.leaf) {
    return leafReducer(node)
  }

  // populate children IDs with actual areas
  const nodeWithSubAreas = await node.populate('children')

  const results = await Promise.all(
    nodeWithSubAreas.children.map(async entry => {
      const area: any = entry
      /* eslint-disable-next-line */
      return limiter(postOrderVisit, (area as AreaMongoType))
    }
    ))

  return await nodeReducer(results, node)
}

/**
 * Calculate stats for leaf node (crag).  Can also be used
 * to collect stats for an area.
 * @param node leaf area/crag
 * @returns aggregate type
 */
const leafReducer = (node: AreaMongoType): ResultType => {
  return {
    totalClimbs: node.totalClimbs,
    bbox: node.metadata.bbox,
    density: node.density,
    aggregate: node.aggregate
  }
}

const nodeReducer = async (result: ResultType[], node: AreaMongoType): Promise<ResultType> => {
  const initial: ResultType = {
    totalClimbs: 0,
    bbox: [-180, -90, 180, 90],
    density: 0,
    aggregate: {
      byGrade: [],
      byType: []
    }
  }

  const z = result.reduce((acc, curr, index) => {
    const { totalClimbs, bbox: _bbox, aggregate } = curr
    const bbox = index === 0 ? _bbox : bboxFromList([_bbox, acc.bbox])
    return {
      totalClimbs: acc.totalClimbs + totalClimbs,
      bbox,
      density: areaDensity(bbox, totalClimbs),
      aggregate: mergeAggregates(acc.aggregate, aggregate)
    }
  }, initial)

  const { totalClimbs, bbox, density, aggregate } = z
  node.totalClimbs = totalClimbs
  node.metadata.bbox = bbox
  node.density = density
  node.aggregate = aggregate
  await node.save()
  return z
}
