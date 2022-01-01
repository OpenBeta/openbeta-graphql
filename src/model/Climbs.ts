import { MongoDataSource } from 'apollo-datasource-mongodb'
import { ClimbType } from '../db/ClimbTypes'

export type ClimbDatasourceType = MongoDataSource<ClimbType>

export default class Climbs extends MongoDataSource<ClimbType> {
  async all (): Promise<any> {
    return await this.collection.find({}).toArray()
  }

  async findOneByClimbUUID (uuid: string): Promise<any> {
    return await this.collection.findOne({ 'metadata.climb_id': uuid })
  }
}
