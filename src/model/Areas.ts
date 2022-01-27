import mongoose from 'mongoose'
import { MongoDataSource } from 'apollo-datasource-mongodb'
import { Filter } from 'mongodb'
import { createAreaModel } from '../db/index.js'

import { AreaType } from '../db/AreaTypes'
import { GQLFilter, AreaFilterParams, PathTokenParams, LeafStatusParams, ComparisonFilterParams } from '../types'
import { ClimbType } from '../db/ClimbTypes.js'

export default class Areas extends MongoDataSource<AreaType> {
  areaModel = createAreaModel('areas')
  // async all (): Promise<any> {
  //   const rs = this.collection.find({})
  //   return await rs.toArray()
  // }

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

  async findOneByAreaUUID (uuid: string): Promise<any> {
    return await this.collection.findOne({ 'metadata.area_id': uuid })
  }

  async findOneClimbById (id: string): Promise<ClimbType|null> {
    const rs = await this.areaModel
      .findOne({ 'metadata.leaf': true })
      .where({ 'climbs._id': new mongoose.Types.ObjectId(id) })
      .select({ 'climbs.$': 1 })
    return rs !== null && rs.climbs.length === 1 ? rs.climbs[0] : await Promise.resolve(null)
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
}
