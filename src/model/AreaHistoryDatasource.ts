import { MongoDataSource } from 'apollo-datasource-mongodb'

import { getAreaModel, getAreaHistoryModel } from '../db/index.js'
import { AreaHistoryType } from '../db/ClimbHistoryType.js'
import { MUUID } from 'uuid-mongodb'

export default class AreaHistoryDataSource extends MongoDataSource<AreaHistoryType> {
  areaModel = getAreaModel()
  areaHistoryModel = getAreaHistoryModel()

  async getChangesByUuid (areaUuid: MUUID): Promise<AreaHistoryType[]> {
    const filter = {
      'change.fullDocument.metadata.area_id': areaUuid
    }

    const rs = await this.areaHistoryModel
      .find(filter)
      .sort({
        'change.clusterTime': 1
      }).lean()

    return rs as AreaHistoryType[]
  }
}
