import { MongoDataSource } from 'apollo-datasource-mongodb'

import { getChangeLogModel } from '../db/index.js'
import { MUUID } from 'uuid-mongodb'
import { AreaChangeLogType } from '../db/ChangeLogType.js'

export class AreaHistoryDataSource extends MongoDataSource<AreaChangeLogType> {
  changelogModel = getChangeLogModel()

  async getChangeSetsByUuid (areaUuid: MUUID | null): Promise<AreaChangeLogType[]> {
    let filter: any = {
      kind: 'areas'
    }
    if (areaUuid != null) {
      filter = Object.assign(filter, {
        'changes.fullDocument.metadata.area_id': areaUuid
      })
    }

    const rs = await this.changelogModel
      .find(filter)
      .sort({
        _id: 1
      }).lean()

    return rs as AreaChangeLogType[]
  }
}

// TS error bug: https://github.com/GraphQLGuide/apollo-datasource-mongodb/issues/88
// @ts-expect-error
export const areaHistoryDataSource = new AreaHistoryDataSource(getChangeLogModel())
