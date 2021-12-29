import { MongoDataSource } from 'apollo-datasource-mongodb'
import { AreaType } from '../db/AreaTypes'

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
    return await this.collection.find({ area_name: param }).toArray()
  }

  async findAreasWithClimbs (): Promise<any> {
    return await this.collection.find({ 'metadata.leaf': true }).toArray()
  }
}
