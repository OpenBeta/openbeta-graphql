import { MongoDataSource } from 'apollo-datasource-mongodb'

import { getChangeLogModel } from '../db/index.js'
import { MUUID } from 'uuid-mongodb'
import { AreaChangeLogType } from '../db/ChangeLogType.js'

export class AreaHistoryDataSource extends MongoDataSource<AreaChangeLogType> {
  changelogModel = getChangeLogModel()

  async getChangeSetsByUuid (areaUuid?: MUUID): Promise<AreaChangeLogType[]> {
    // if (areaUuid != null) {
    //   filter = Object.assign(filter, {
    //     'changes.fullDocument.metadata.area_id': areaUuid
    //   })
    // }

    let rs
    if (areaUuid == null) {
      const filter: any = {
        $match: {
          'changes.kind': 'areas'
        }
      }
      rs = await this.changelogModel.aggregate([
        filter
        // {
        //   $project: {
        //     changes: {
        //       $sortArray: {
        //         input: '$changes',
        //         sortBy: { _id: -1 }
        //       }
        //     }
        //   }
        // }
      ])
      return rs as AreaChangeLogType[]
    } else {
      // const filter = {
      //   $match: {
      //     changes: {
      //       $elemMatch:
      //          { 'fullDocument.metadata.area_id': areaUuid, kind: 'areas' }
      //     }

      //     // kind: 'areas'
      //   }
      // }

      const rs2 = await this.changelogModel
        .aggregate([
          // filter,
          {
            $project: {
              _id: 1,
              changes: {
                $filter: {
                  input: '$changes',
                  as: 'change',
                  cond: { $eq: ['$$change.fullDocument.metadata.area_id', areaUuid] }
                }
              }
            }
          },
          // {
          //   $project: {
          //     first: { $arrayElemAt: ['$changes.fullDocument', 0] }
          //   }
          // }
          {
            $unwind: '$changes'
          }
          // },
          // // {
          // //   $unwind: '$changes.fullDocument'
          // // }
          // {
          //   $match: { 'changes.fullDocument.metadata.area_id': areaUuid }
          // }
          // {
          //   $unwind: '$changes.fullDocument'
          // }
          // {
          //   $unwind: '$changes._id'
          // }
          // Group back to the original form if you want
          // {
          //   $group: {
          //     _id: '$_id',
          //     changes: { $push: '$changes.' }
          //   }
          // }
        ])
      return rs2
    }
  }
}

// TS error bug: https://github.com/GraphQLGuide/apollo-datasource-mongodb/issues/88
// @ts-expect-error
export const areaHistoryDataSource = new AreaHistoryDataSource(getChangeLogModel())
