import { MongoDataSource } from 'apollo-datasource-mongodb'
import { Filter } from 'mongodb'
import muuid, { MUUID } from 'uuid-mongodb'
import bboxPolygon from '@turf/bbox-polygon'

import { getAreaModel, getMediaModel } from '../db/index.js'
import { AreaType } from '../db/AreaTypes'
import { GQLFilter, AreaFilterParams, PathTokenParams, LeafStatusParams, ComparisonFilterParams, StatisticsType, CragsNear, BBoxType } from '../types'
import { getClimbModel } from '../db/ClimbSchema.js'
import { ClimbExtType } from '../db/ClimbTypes.js'

export default class AreaDataSource extends MongoDataSource<AreaType> {
  areaModel = getAreaModel()
  climbModel = getClimbModel()
  mediaModel = getMediaModel()

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

  async findOneAreaByUUID (uuid: muuid.MUUID): Promise<any> {
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
        }
      ])

    if (rs != null && rs.length === 1) {
      return rs[0]
    }
    return null
  }

  async findManyClimbsByUuids (uuidList: muuid.MUUID[]): Promise<any> {
    const rs = await this.climbModel.find().where('_id').in(uuidList)
    return rs
  }

  async findMediaByAreaId (areaId: MUUID): Promise<any> {
    const rs = await getMediaModel()
      .aggregate([
        {
          $lookup: {
            from: 'climbs', // other collection name
            localField: 'destinationId',
            foreignField: '_id',
            as: 'climb',
            pipeline: [{
              $lookup: {
                from: 'areas', // other collection name
                localField: 'metadata.areaRef',
                foreignField: 'metadata.area_id',
                as: 'area'
              }
            },
            {
              $match: {
                'area.ancestors': { $regex: areaId.toUUID().toString() }
              }
            },
            {
              $unwind: '$area'
            }
            ]
          }
        },
        {
          $unwind: '$climb'
        }
      ])

    if (rs != null) {
      return rs
    }
    return null
  }

  /**
   * Find a climb by uuid.  Also return some info from the parent area (crag).
   * @param uuid
   * @returns
   */
  async findOneClimbByUUID (uuid: muuid.MUUID): Promise<ClimbExtType|null> {
    const rs = await this.climbModel
      .aggregate([
        { $match: { _id: uuid } },
        {
          $lookup: {
            from: 'areas', // other collection name
            localField: 'metadata.areaRef',
            foreignField: 'metadata.area_id',
            as: 'area', // clobber array of climb IDs with climb objects
            pipeline: [
              {
                $project: { // only include specific fields
                  _id: 0,
                  ancestors: 1,
                  pathTokens: 1
                }
              }
            ]
          }
        },
        { $unwind: '$area' }, // Previous stage returns as an array of 1 element. 'unwind' turn it into an object.
        {
          $replaceWith: { // Merge area.* with top-level object
            $mergeObjects: ['$$ROOT', '$area']
          }
        }
      ])

    if (rs != null && rs?.length === 1) {
      return rs[0]
    }
    return null
  }

  async findMediaByClimbId (climbId: MUUID): Promise<any> {
    const rs = await getMediaModel().find({ destinationId: climbId }).lean()
    if (rs != null) {
      return rs
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
      { $addFields: { placeId: placeId } }])
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
