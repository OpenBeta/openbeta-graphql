import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'
import { AreaChangeLogType } from '../db/ChangeLogType.js'
import { getChangeLogModel } from '../db/index.js'

export class AreaHistoryDataSource extends MongoDataSource<AreaChangeLogType> {
  changelogModel = getChangeLogModel()

  async getChangeSetsByUuid (areaUuid?: MUUID): Promise<AreaChangeLogType[]> {
    let rs
    if (areaUuid == null) {
      const filter: any = {
        $match: {
          'changes.kind': 'areas'
        }
      }

      rs = await this.changelogModel.aggregate([
        filter,
        {
          $sort: {
            createdAt: -1
          }
        }
      ])
      return rs as AreaChangeLogType[]
    } else {
      const filter = {
        $match: {
          changes: {
            $elemMatch:
              { 'fullDocument.metadata.area_id': areaUuid, kind: 'areas' }
          }
        }
      }

      const rs2 = await this.changelogModel
        .aggregate([
          filter,
          {
            $sort: {
              createdAt: -1
            }
          }
        ])
      return rs2
    }
  }
}

// TS error bug: https://github.com/GraphQLGuide/apollo-datasource-mongodb/issues/88
// @ts-expect-error
export const areaHistoryDataSource = new AreaHistoryDataSource(getChangeLogModel())
