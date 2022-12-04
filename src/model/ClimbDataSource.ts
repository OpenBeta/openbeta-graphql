import { MongoDataSource } from 'apollo-datasource-mongodb'
import { getAreaModel } from '../db/AreaSchema.js'
import { ClimbType } from '../db/ClimbTypes.js'

export default class ClimbDataSource extends MongoDataSource<ClimbType> {
  areaModel = getAreaModel()
// TODO move climb helper functions from AreaDataSource here
}
