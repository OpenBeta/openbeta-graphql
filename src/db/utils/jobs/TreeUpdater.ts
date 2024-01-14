import mongoose from 'mongoose'
import { featureCollection, BBox, Point, Polygon } from '@turf/helpers'
import bbox2Polygon from '@turf/bbox-polygon'
import convexHull from '@turf/convex'
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
 *
 * Background:  The code was written when there's
 * only 1 country (USA) and I didn't know about `batchSize()`.  To get around Out-of-memory issue
 * the traversal was split into 2 steps:
 * - 1. Aggregate children of 2nd-level nodes (all US states)
 * - 2. Aggregate all US states
 *
 * Todo: improve the tree traversal so that it can work with 1 country at a time or
 *  create a new bottom-up traversal, starting from the updated node/area and bubble the
 * update up to its parent.
 */
export const visitAllAreas = async (): Promise<void> => {
  const areaModel = getAreaModel('areas')

  // Step 1: Start with 2nd level of tree, eg 'state' or 'province' level and recursively update all nodes.
  let iterator = areaModel.find({ pathTokens: { $size: 2 } }).batchSize(10).allowDiskUse(true)

  for await (const root of iterator) {
    await postOrderVisit(root)
  }

  // Step 2:
  // For each country:
  //   combine the stats from all states/provinces --> update country
  iterator = areaModel.find({ pathTokens: { $size: 1 } }).batchSize(10)
  for await (const countryNode of iterator) {
    const stateNodes = await countryNode.populate('children')
    const results = await Promise.all(
      stateNodes.children.map(async entry => {
        const area: any = entry
        return leafReducer((area.toObject() as AreaType))
      })
    )
    await nodesReducer(results, countryNode)
  }
}

interface ResultType {
  density: number
  totalClimbs: number
  bbox: BBox
  lnglat: Point
  aggregate: AggregateType
  polygon?: Polygon
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
    aggregate: node.aggregate ?? {
      byGrade: [],
      byDiscipline: {},
      byGradeBand: {
        unknown: 0,
        beginner: 0,
        intermediate: 0,
        advanced: 0,
        expert: 0
      }
    }
  }
}

/**
 * Calculate convex hull polyon contain all child areas
 */
const calculatePolygonFromChildren = (nodes: ResultType[]): Polygon | undefined => {
  const childAsPolygons = nodes.map(node => bbox2Polygon(node.bbox))
  const fc = featureCollection(childAsPolygons)
  const polygonFeature = convexHull(fc)

  return polygonFeature?.geometry
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
    polygon: undefined,
    density: 0,
    aggregate: {
      byGrade: [],
      byDiscipline: {},
      byGradeBand: {
        unknown: 0,
        beginner: 0,
        intermediate: 0,
        advanced: 0,
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
      density: -1,
      polygon: undefined,
      aggregate: mergeAggregates(acc.aggregate, aggregate)
    }
  }, initial)

  z.polygon = calculatePolygonFromChildren(result)
  z.density = areaDensity(z.bbox, z.totalClimbs)

  const { totalClimbs, bbox, density, aggregate } = z

  parent.totalClimbs = totalClimbs
  parent.metadata.bbox = bbox
  parent.density = density
  parent.aggregate = aggregate
  parent.metadata.polygon = z.polygon
  await parent.save()
  return z
}
