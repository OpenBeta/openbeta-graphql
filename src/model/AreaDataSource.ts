import { MongoDataSource } from 'apollo-datasource-mongodb'
import { Filter } from 'mongodb'
import muuid from 'uuid-mongodb'
import bboxPolygon from '@turf/bbox-polygon'
import { Types as mongooseTypes } from 'mongoose'

import { getAreaModel, getMediaModel, getMediaObjectModel } from '../db/index.js'
import { AreaType } from '../db/AreaTypes'
import { GQLFilter, AreaFilterParams, PathTokenParams, LeafStatusParams, ComparisonFilterParams, StatisticsType, CragsNear, BBoxType } from '../types'
import { getClimbModel } from '../db/ClimbSchema.js'
import { ClimbGQLQueryType, ClimbType } from '../db/ClimbTypes.js'
import { logger } from '../logger.js'

export default class AreaDataSource extends MongoDataSource<AreaType> {
  areaModel = getAreaModel()
  climbModel = getClimbModel()
  tagModel = getMediaModel()
  mediaObjectModal = getMediaObjectModel()

  async findAreasByFilter (filters?: GQLFilter): Promise<any> {
    let mongoFilter: any = {}
    if (filters !== undefined) {
      mongoFilter = Object.entries(filters).reduce<Filter<AreaType>>((acc, [key, filter]): Filter<AreaType> => {
        switch (key) {
          case 'area_name': {
            const areaFilter = (filter as AreaFilterParams)
            const param = areaFilter.exactMatch !== true ? new RegExp(areaFilter.match, 'ig') : areaFilter.match
            acc.area_name = param
            break
          }
          case 'leaf_status': {
            const leafFilter = filter as LeafStatusParams
            acc['metadata.leaf'] = leafFilter.isLeaf
            break
          }

          // Add score conversion to climbs
          case 'path_tokens': {
            const pathFilter = filter as PathTokenParams
            if (pathFilter.exactMatch === true) {
              acc.pathTokens = pathFilter.tokens
            } else {
              const filter: Record<string, any> = {}
              filter.$all = pathFilter.tokens
              if (pathFilter.size !== undefined) {
                filter.$size = pathFilter.size
              }
              acc.pathTokens = filter
            }
            break
          }
          case 'field_compare': {
            const comparisons = {}
            for (const f of filter as ComparisonFilterParams[]) {
              const { field, num, comparison } = f
              const currFiled = comparisons[field]
              if (currFiled === undefined) {
                comparisons[field] = { [`$${comparison}`]: num }
              } else {
                comparisons[field] = { ...currFiled, [`$${comparison}`]: num }
              }
              acc = { ...acc, ...comparisons }
            }
            break
          }
          default:
            break
        }
        return acc
      }, {})
    }

    mongoFilter._deleting = { $eq: null } // marked for deletion

    // Todo: figure whether we need to populate 'climbs' array
    return this.collection.find(mongoFilter)
  }

  async findManyByPathHash (pathHashes: string[]): Promise<any> {
    return await this.collection.aggregate([
      { $match: { pathHash: { $in: pathHashes } } },
      { $addFields: { __order: { $indexOfArray: [pathHashes, '$pathHash'] } } },
      { $sort: { __order: 1 } }
    ]).toArray()
  }

  async listAllCountries (): Promise<any> {
    try {
      return await this.areaModel.find({ pathTokens: { $size: 1 } }).lean()
    } catch (e) {
      logger.error(e)
      return []
    }
  }

  async findOneAreaByUUID (uuid: muuid.MUUID): Promise<AreaType> {
    const rs = await this.areaModel
      .aggregate([
        { $match: { 'metadata.area_id': uuid, _deleting: { $exists: false } } },
        {
          $lookup: {
            from: 'climbs', // other collection name
            localField: 'climbs',
            foreignField: '_id',
            as: 'climbs' // clobber array of climb IDs with climb objects
          }
        },
        { // Self-join to populate children areas.
          $lookup: {
            from: 'areas',
            localField: 'children',
            foreignField: '_id',
            as: 'children'
          }
        },
        {
          $set: {
            'climbs.gradeContext': '$gradeContext' // manually set area's grade context to climb
          }
        },
        {
          $set: {
            climbs: { $sortArray: { input: '$climbs', sortBy: { 'metadata.left_right_index': 1 } } },
            children: { $sortArray: { input: '$children', sortBy: { 'metadata.leftRightIndex': 1 } } }
          }
        }
      ])

    if (rs != null && rs.length === 1) {
      return rs[0]
    }
    throw new Error(`Area ${uuid.toUUID().toString()} not found.`)
  }

  async findManyClimbsByUuids (uuidList: muuid.MUUID[]): Promise<ClimbType[]> {
    const rs = await this.climbModel.find().where('_id').in(uuidList)
    return rs
  }

  /**
   * Find a climb by uuid.  Also return the parent area object (crag or boulder).
   *
   * SQL equivalent:
   * ```sql
   * SELECT
   *   climbs.*,
   *   areas.ancestors as ancestors,
   *   areas.pathTokens as pathTokens,
   *   (select * from areas) as parent
   * FROM climbs, areas
   * WHERE
   *   climbs.metadata.areaRef == areas.metadata.area_id
   * ```
   * @param uuid climb uuid
   */
  async findOneClimbByUUID (uuid: muuid.MUUID): Promise<ClimbGQLQueryType | null> {
    const rs = await this.climbModel
      .aggregate([
        { $match: { _id: uuid } },
        {
          $lookup: {
            from: 'areas', // other collection name
            localField: 'metadata.areaRef',
            foreignField: 'metadata.area_id',
            as: 'parent' // add a new parent field
          }
        },
        { $unwind: '$parent' }, // Previous stage returns as an array of 1 element. 'unwind' turn it into an object.
        {
          $set: {
            // create aliases
            pathTokens: '$parent.pathTokens',
            ancestors: '$parent.ancestors'
          }
        }
      ])

    if (rs != null && rs?.length === 1) {
      return rs[0]
    }
    return null
  }

  /**
   * Find all descendants (inclusive) starting from path
   * @param path comma-separated _id's of area
   * @param isLeaf
   * @returns array of areas
   */
  async findDescendantsByPath (path: string, isLeaf: boolean = false): Promise<AreaType[]> {
    const regex = new RegExp(`^${path}`)
    const data = this.collection.find({ ancestors: regex, 'metadata.leaf': isLeaf })
    return await data.toArray()
  }

  /**
   * Get whole db stats
   * @returns
   */
  async getStats (): Promise<StatisticsType> {
    const stats = {
      totalClimbs: 0,
      totalCrags: 0
    }
    const agg1 = await this.climbModel.countDocuments()

    const agg2 = await this.areaModel.aggregate([{ $match: { 'metadata.leaf': true } }])
      .count('totalCrags')

    if (agg2.length === 1) {
      const totalClimbs = agg1
      const totalCrags = agg2[0].totalCrags
      return {
        totalClimbs,
        totalCrags
      }
    }

    return stats
  }

  async getCragsNear (
    placeId: string,
    lnglat: [number, number],
    minDistance: number,
    maxDistance: number,
    includeCrags: boolean = false): Promise<CragsNear[]> {
    const rs = await this.areaModel.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: lnglat },
          key: 'metadata.lnglat',
          distanceField: 'distance',
          distanceMultiplier: 0.001,
          minDistance,
          maxDistance,
          query: { 'metadata.leaf': true },
          spherical: true
        }
      },
      {
        // Exclude climbs in this crag to reduce result size.
        // This will result in climbs: null
        // We'll set them to [] in the end to avoid potential unexpected null problems.
        $unset: ['climbs']
      },
      {
        // group result by 'distance' from center
        $bucket: {
          groupBy: '$distance',
          boundaries: [
            0, 48, 96, 160, 240
          ],
          default: 'theRest',
          output: {
            count: {
              $sum: 1
            },
            // Only include crags data (a lot) if needed
            crags: {
              $push: includeCrags ? '$$ROOT' : ''
            }
          }
        }
      },
      { $unset: 'crags.distance' }, // remove 'distance' field
      { $set: { 'crags.climbs': [] } }, // set to empty []
      // this is a hack to add an arbitrary token to make the graphql result uniquely identifiable for Apollo client-side cache.  Todo: look for a better way as this could be potential injection.
      { $addFields: { placeId } }])
    return rs
  }

  async findCragsWithin (bbox: BBoxType, zoom: number): Promise<any> {
    const polygon = bboxPolygon(bbox)
    const filter = {
      'metadata.lnglat': {
        $geoWithin: {
          $geometry: polygon.geometry
        }
      },
      'metadata.leaf': zoom >= 11
    }
    return await this.areaModel.find(filter).lean()
  }
}
