import mongoose from 'mongoose'
import { MongoDataSource } from 'apollo-datasource-mongodb'
import { Filter } from 'mongodb'
import muuid from 'uuid-mongodb'

import { createAreaModel } from '../db/index.js'
import { AreaType } from '../db/AreaTypes'
import { ClimbExtType } from '../db/ClimbTypes.js'
import { GQLFilter, AreaFilterParams, PathTokenParams, LeafStatusParams, ComparisonFilterParams, StatisticsType, CragsNear } from '../types'

export default class AreaDataSource extends MongoDataSource<AreaType> {
  areaModel = createAreaModel('areas')

  climbsView = mongoose.connection.collection('climbsView')

  async findAreasByFilter (filters?: GQLFilter): Promise<any> {
    let mongoFilter = {}
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

    const result = await this.collection.find(mongoFilter)

    return result
  }

  async findManyByPathHash (pathHashes: string[]): Promise<any> {
    return await this.collection.aggregate([
      { $match: { pathHash: { $in: pathHashes } } },
      { $addFields: { __order: { $indexOfArray: [pathHashes, '$pathHash'] } } },
      { $sort: { __order: 1 } }
    ]).toArray()
  }

  async findOneAreaByUUID (uuid: muuid.MUUID): Promise<AreaType> {
    return (await this.collection.findOne({ 'metadata.area_id': uuid }) as AreaType)
  }

  async findOneClimbByUUID (uuid: muuid.MUUID): Promise<ClimbExtType | null> {
    return (await this.climbsView.findOne({ 'metadata.climb_id': uuid })) as ClimbExtType
  }

  async findOneClimbById (id: string): Promise<ClimbExtType | null> {
    return (await this.climbsView.findOne({ _id: new mongoose.Types.ObjectId(id) })) as ClimbExtType
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
    const agg1 = await this.areaModel.aggregate([{ $match: { pathTokens: { $size: 1 } } }])
      .project({ totalClimbs: { $sum: '$totalClimbs' }, _id: 0 })

    const agg2 = await this.areaModel.aggregate([{ $match: { 'metadata.leaf': true } }])
      .count('totalCrags')

    if (agg1.length === 1 && agg2.length === 1) {
      const totalClimbs = agg1[0].totalClimbs
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
}
