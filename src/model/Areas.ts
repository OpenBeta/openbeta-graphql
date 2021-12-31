import { MongoDataSource } from 'apollo-datasource-mongodb'
import { Filter } from 'mongodb'
import { AreaType } from '../db/AreaTypes'
import { GQLFilter, AreaFilterParams, LeafStatusParams } from '../types'

export default class Areas extends MongoDataSource<AreaType> {
  async all (): Promise<any> {
    const rs = this.collection.find({})
    return await rs.toArray()
  }

  /**
   * Wildcard, case-insensitive search for area(s). Similar SQL Like '%a%'.
   * @param name area name
   */
  async findByName (name: string, wildcard: boolean = false): Promise<any> {
    const param = wildcard ? new RegExp(name, 'ig') : name
    return this.collection.find({ area_name: param })
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
          default:
            break
        }
        return acc
      }, {})
    }

    const result = await this.collection.find(mongoFilter)

    return result
  }

  async findAreasWithClimbs (): Promise<any> {
    return await this.collection.find({ 'metadata.leaf': true }).toArray()
  }

  async findOneByAreaUUID (uuid: string): Promise<any> {
    return await this.collection.findOne({ 'metadata.area_id': uuid })
  }
}
