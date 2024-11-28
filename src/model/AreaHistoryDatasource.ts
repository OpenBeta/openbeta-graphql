import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'
import { AreaChangeLogType, ChangeLogType } from '../db/ChangeLogType.js'
import { getChangeLogModel } from '../db/index.js'

export class AreaHistoryDataSource extends MongoDataSource<ChangeLogType> {
  changelogModel = getChangeLogModel()

  async getChangeSetsByUuid (areaUuid?: MUUID): Promise<AreaChangeLogType[]> {
    let rs
    if (areaUuid == null) {
      // No area id specified: return all changes
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
          // https://github.com/Automattic/mongoose/issues/12415
          // {
          //   $set: {
          //     changes: {
          //       $sortArray: {
          //         input: '$changes',
          //         sortBy: { 'fullDocument._change.seq': -1 }
          //       }
          //     }
          //   }
          // },
          {
            $sort: {
              createdAt: -1
            }
          }
        ])
      return rs2
    }
  }

  static instance: AreaHistoryDataSource

  static getInstance (): AreaHistoryDataSource {
    if (AreaHistoryDataSource.instance == null) {
      // @ts-expect-error
      AreaHistoryDataSource.instance = new AreaHistoryDataSource({ modelOrCollection: getChangeLogModel() })
    }
    return AreaHistoryDataSource.instance
  }
}
