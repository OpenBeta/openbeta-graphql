import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'
import { OrganizationChangeLogType } from '../db/ChangeLogType.js'
import { getChangeLogModel } from '../db/index.js'

export class OrganizationHistoryDataSource extends MongoDataSource<OrganizationChangeLogType> {
  changelogModel = getChangeLogModel()

  async getChangeSetsByOrgId (orgId?: MUUID): Promise<OrganizationChangeLogType[]> {
    let rs
    if (orgId == null) {
      // No orgId specified: return all changes
      const filter: any = {
        $match: {
          'changes.kind': 'organizations'
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
      return rs as OrganizationChangeLogType[]
    } else {
      const filter = {
        $match: {
          changes: {
            $elemMatch:
              { 'fullDocument.orgId': orgId, kind: 'organizations' }
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
}

// TS error bug: https://github.com/GraphQLGuide/apollo-datasource-mongodb/issues/88
// @ts-expect-error
export const organizationHistoryDataSource = new OrganizationHistoryDataSource(getChangeLogModel())
