import mongoose from 'mongoose'
import { featureCollection, BBox, Point, Polygon, Feature } from '@turf/helpers'
import bbox2Polygon from '@turf/bbox-polygon'
import bboxFromGeojson from '@turf/bbox'
import convexHull from '@turf/convex'
import pLimit from 'p-limit'

import { getAreaModel } from '../../../AreaSchema.js'
import { AreaType, AggregateType } from '../../../AreaTypes.js'
import { areaDensity } from '../../../../geo-utils.js'
import { mergeAggregates } from '../../Aggregate.js'
import { ChangeRecordMetadataType } from '../../../../db/ChangeLogType.js'

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
export const updateAllAreas = async (): Promise<void> => {
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

export interface StatsSummary {
  density: number
  totalClimbs: number
  bbox?: BBox
  lnglat?: Point
  aggregate: AggregateType
  polygon?: Polygon
}

async function postOrderVisit (node: AreaMongoType): Promise<StatsSummary> {
  if (node.metadata.leaf || node.children.length === 0) {
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
export const leafReducer = (node: AreaType): StatsSummary => {
  return {
    totalClimbs: node.totalClimbs,
    bbox: node.metadata.bbox,
    lnglat: node.metadata.lnglat,
    polygon: node.metadata.polygon,
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
const calculatePolygonFromChildren = (nodes: StatsSummary[]): Feature<Polygon> | null => {
  const childAsPolygons = nodes.reduce<Array<Feature<Polygon>>>((acc, curr) => {
    if (curr.bbox != null) {
      acc.push(bbox2Polygon(curr.bbox))
    }
    return acc
  }, [])
  const fc = featureCollection(childAsPolygons)
  const polygonFeature = convexHull(fc)
  return polygonFeature
}

interface OPTIONS {
  session: mongoose.ClientSession
  changeRecord: ChangeRecordMetadataType
}

/**
 * Calculate stats from a list of nodes
 * @param childResults nodes
 * @param parent parent node to save stats to
 * @returns Calculated stats
 */
export const nodesReducer = async (childResults: StatsSummary[], parent: AreaMongoType, options?: OPTIONS): Promise<StatsSummary> => {
  const initial: StatsSummary = {
    totalClimbs: 0,
    bbox: undefined,
    lnglat: undefined,
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
  let nodeSummary: StatsSummary = initial
  if (childResults.length === 0) {
    const { totalClimbs, aggregate, density } = initial
    parent.totalClimbs = totalClimbs
    parent.density = density
    parent.aggregate = aggregate
  } else {
    nodeSummary = childResults.reduce((acc, curr) => {
      const { totalClimbs, aggregate, lnglat, bbox } = curr
      return {
        totalClimbs: acc.totalClimbs + totalClimbs,
        bbox,
        lnglat,
        density: -1,
        polygon: undefined,
        aggregate: mergeAggregates(acc.aggregate, aggregate)
      }
    }, initial)

    const polygon = calculatePolygonFromChildren(childResults)
    nodeSummary.polygon = polygon?.geometry
    nodeSummary.bbox = bboxFromGeojson(polygon)
    nodeSummary.density = areaDensity(nodeSummary.bbox, nodeSummary.totalClimbs)

    const { totalClimbs, bbox, density, aggregate } = nodeSummary

    parent.totalClimbs = totalClimbs
    parent.metadata.bbox = bbox
    parent.density = density
    parent.aggregate = aggregate
    parent.metadata.polygon = nodeSummary.polygon
  }

  if (options != null) {
    const { session, changeRecord } = options
    parent._change = changeRecord
    parent.updatedBy = changeRecord.user
    await parent.save({ session })
  } else {
    await parent.save()
  }
  return nodeSummary
}
