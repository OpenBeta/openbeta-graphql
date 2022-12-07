import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'
import { getAreaModel } from '../db/AreaSchema.js'
import { getClimbModel } from '../db/ClimbSchema.js'
import { ClimbType } from '../db/ClimbTypes.js'

// TODO move climb helper functions from AreaDataSource here
export default class ClimbDataSource extends MongoDataSource<ClimbType> {
  areaModel = getAreaModel()
  climbModel = getClimbModel()

  async findOneClimbByMUUID (id: MUUID): Promise<ClimbType> {
    const rs = await this.climbModel.findOne({ _id: id }).lean()
    if (rs == null) throw new Error(`Climb with id ${id.toUUID().toString()}`)
    return rs
  }
}
