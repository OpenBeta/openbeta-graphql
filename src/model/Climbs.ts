import { MongoDataSource } from 'apollo-datasource-mongodb'
import { ClimbType } from '../db/ClimbTypes'

export type ClimbDatasourceType = MongoDataSource<ClimbType>

export default class Climbs extends MongoDataSource<ClimbType> {
// TODO move climb helper functions from AreaDataSource here
}
