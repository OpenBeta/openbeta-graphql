import { MongoDataSource } from 'apollo-datasource-mongodb'

import { getChangeLogModel } from '../db/index.js'
import { MUUID } from 'uuid-mongodb'
import { AreaChangeLogType } from '../db/ChangeLogType.js'

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
        filter
      ])
      return rs as AreaChangeLogType[]
    } else {
      const filter = {
        $match: {
          changes: {
            $elemMatch:
               { 'fullDocument.metadata.area_id': areaUuid, kind: 'areas' }
          }
          // kind: 'areas'
        }
      }

      const rs2 = await this.changelogModel
        .aggregate([
          filter,
          // Do we want to show strictly changes to an area or the transanction
          // that may include other areas?
          // Commented code: to show the former
          // {
          //   $project: {
          //     _id: 1,
          //     editedBy: 1,
          //     createdAt: 1,
          //     operation: 1,
          //     changes: {
          //       $filter: {
          //         input: '$changes',
          //         as: 'change',
          //         cond: { $eq: ['$$change.fullDocument.metadata.area_id', areaUuid] }
          //       }
          //     }
          //   }
          // },
          // {
          //   $unwind: '$changes'
          // },
          {
            $sort: {
              _id: -1
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
