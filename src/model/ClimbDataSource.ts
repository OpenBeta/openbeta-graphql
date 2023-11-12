import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'
import { getAreaModel } from '../db/AreaSchema'
import { getClimbModel } from '../db/ClimbSchema'
import { ClimbType } from '../db/ClimbTypes'

// TODO move climb helper functions from AreaDataSource here
export default class ClimbDataSource extends MongoDataSource<ClimbType> {
  areaModel = getAreaModel()
  climbModel = getClimbModel()

  /**
   * Helper look up method.  This is mainly used for testing.  See `AreaDataSource.findOneClimbByUUID()` for public API method.
   * @param id climb uuid
   * @returns ClimbType object or null if not found
   */
  async findOneClimbByMUUID (id: MUUID): Promise<ClimbType | null> {
    const rs = await this.climbModel.findOne({ _id: id, _deleting: { $eq: null } }).lean()
    return rs
  }
}
