import { MongoDataSource } from 'apollo-datasource-mongodb'
import { Filter } from 'mongodb'
import { AreaType } from '../db/AreaTypes'
import { GQLFilter, AreaFilterParams, PathTokenParams, LeafStatusParams } from '../types'

export default class Areas extends MongoDataSource<AreaType> {
  async all (): Promise<any> {
    const rs = this.collection.find({})
    return await rs.toArray()
  }

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
          case 'path_tokens': {
            const pathFilter = filter as PathTokenParams
            acc.pathTokens = pathFilter.exactMatch === true
              ? pathFilter.tokens
              : { $all: pathFilter.tokens }
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
    const a = await this.collection.find({ pathHash: { $in: pathHashes } }).toArray()
    console.log('Match', a)
    return a.map(b => b.metadata.area_id)
  }

  async findOneByAreaUUID (uuid: string): Promise<any> {
    return await this.collection.findOne({ 'metadata.area_id': uuid })
  }
}
