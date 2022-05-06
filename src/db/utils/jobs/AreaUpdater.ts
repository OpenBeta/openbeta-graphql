import mongoose from 'mongoose'
import { BBox, Point, feature, featureCollection } from '@turf/helpers'
import centroid from '@turf/centroid'
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
 * 1. From the root node, recursively visit all children until arrive at leaf nodes (crags).
 * 2. Reduce each leaf node into a single object. Return to parent.
 * 3. Reduce all children results.  Repeat.
 */
export const visitAllAreas = async (): Promise<void> => {
  const areaModel = getAreaModel('areas')

  // Start with 2nd level of tree
  let iterator = areaModel.find({ pathTokens: { $size: 2 } }).batchSize(10).allowDiskUse(true)

  for await (const root of iterator) {
    await postOrderVisit(root)
  }

  // Get all top-level country nodes.
  // We only have 1  root (US) right now, but code runs asynchronously
  // for each country
  iterator = areaModel.find({ pathTokens: { $size: 1 } }).batchSize(10)
  for await (const root of iterator) {
    const stateNodes = await root.populate('children')
    const results = await Promise.all(
      stateNodes.children.map(async entry => {
        const area: any = entry
        return leafReducer((area.toObject() as AreaType))
      })
    )
    await nodesReducer(results, root)
  }
}

interface ResultType {
  density: number
  totalClimbs: number
  bbox: BBox
  lnglat: Point
  aggregate: AggregateType
}

async function postOrderVisit (node: AreaMongoType): Promise<ResultType> {
  if (node.metadata.leaf) {
    return leafReducer((node.toObject() as AreaType))
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

  return await nodesReducer(results, node)
}

/**
 * Calculate stats for leaf node (crag).  Can also be used
 * to collect stats for an area.
 * @param node leaf area/crag
 * @returns aggregate type
 */
const leafReducer = (node: AreaType): ResultType => {
  return {
    totalClimbs: node.totalClimbs,
    bbox: node.metadata.bbox,
    lnglat: node.metadata.lnglat,
    density: node.density,
    aggregate: node.aggregate
  }
}

/**
 * Calculate stats from a list of nodes
 * @param result nodes
 * @param parent parent node to save stats to
 * @returns Calculated stats
 */
const nodesReducer = async (result: ResultType[], parent: AreaMongoType): Promise<ResultType> => {
  const initial: ResultType = {
    totalClimbs: 0,
    bbox: [-180, -90, 180, 90],
    lnglat: {
      type: 'Point',
      coordinates: [0, 0]
    },
    density: 0,
    aggregate: {
      byGrade: [],
      byDiscipline: {},
      byGradeBand: {
        beginner: 0,
        intermediate: 0,
        advance: 0,
        expert: 0
      }
    }
  }

  const z = result.reduce((acc, curr, index) => {
    const { totalClimbs, bbox: _bbox, aggregate, lnglat } = curr
    const bbox = index === 0 ? _bbox : bboxFromList([_bbox, acc.bbox])
    return {
      totalClimbs: acc.totalClimbs + totalClimbs,
      bbox,
      lnglat, // we'll calculate a new center point later
      density: areaDensity(bbox, totalClimbs),
      aggregate: mergeAggregates(acc.aggregate, aggregate)
    }
  }, initial)

  // Calculate a center for all crags
  const collectionOfAreas = featureCollection(result.map(item => feature(item.lnglat)))
  const calculatedParentCenter = centroid(collectionOfAreas).geometry
  z.lnglat = calculatedParentCenter

  const { totalClimbs, bbox, density, aggregate, lnglat } = z
  parent.metadata.lnglat = lnglat
  parent.totalClimbs = totalClimbs
  parent.metadata.bbox = bbox
  parent.density = density
  parent.aggregate = aggregate
  await parent.save()
  return z
}
