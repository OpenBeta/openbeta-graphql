import mongoose, { ClientSession } from 'mongoose'
import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'

import { getChangeLogModel } from '../db/index.js'
import {
  AreaChangeLogType,
  BaseChangeRecordType,
  ChangeLogType,
  ClimbChangeLogType,
  OpType,
  OrganizationChangeLogType
} from '../db/ChangeLogType'
import { logger } from '../logger.js'
import { AreaHistoryDataSource } from './AreaHistoryDatasource.js'
import { OrganizationHistoryDataSource } from './OrganizationHistoryDatasource.js'

export default class ChangeLogDataSource extends MongoDataSource<ChangeLogType> {
  changeLogModel = getChangeLogModel()

  /**
   * Create a new change set
   * @param uuid
   * @param operation
   * @returns
   */
  async create (session: ClientSession, uuid: MUUID, operation: OpType): Promise<ChangeLogType> {
    const newChangeDoc: ChangeLogType = {
      _id: new mongoose.Types.ObjectId(),
      editedBy: uuid,
      operation,
      changes: []
    }
    const rs = await this.changeLogModel.insertMany(newChangeDoc, { session })
    if (rs?.length !== 1) throw new Error('Error inserting new change')
    return rs[0]
  }

  /**
   * Record a new change in the changeset
   * @param changeRecord
   */
  async record (changeRecord: BaseChangeRecordType): Promise<this> {
    const filter = {
      _id: changeRecord.fullDocument._change?.historyId
    }

    const rs = await this.changeLogModel.updateOne(filter,
      {
        $push: {
          changes: {
            $each: [changeRecord],
            $sort: { 'fullDocument._change.seq': -1 }
          }
        }
      }, {
        upsert: false
      })

    if (rs.matchedCount < 1) {
      logger.error(changeRecord.fullDocument, 'History Id not found.  Ignore change.')
    }
    return this
  }

  async getAreaChangeSets (areaUuid?: MUUID): Promise<AreaChangeLogType[]> {
    return await AreaHistoryDataSource.getInstance().getChangeSetsByUuid(areaUuid)
  }

  async getOrganizationChangeSets (orgId?: MUUID): Promise<OrganizationChangeLogType[]> {
    return await OrganizationHistoryDataSource.getInstance().getChangeSetsByOrgId(orgId)
  }

  /**
   * Return all changes.  For now just handle Area type.
   * @param uuidList optional filter
   * @returns change sets
   */
  async getChangeSets (uuidList: MUUID[]): Promise<Array<AreaChangeLogType | ClimbChangeLogType | OrganizationChangeLogType>> {
    return await this.changeLogModel.aggregate([
      {
        $sort: {
          createdAt: -1
        }
      }
    ]).limit(500)
  }

  async _testRemoveAll (): Promise<void> {
    await this.changeLogModel.deleteMany()
  }

  static instance: ChangeLogDataSource

  static getInstance (): ChangeLogDataSource {
    if (ChangeLogDataSource.instance == null) {
      /**
       * Why suppress TS error? See: https://github.com/GraphQLGuide/apollo-datasource-mongodb/issues/88
       */
      // @ts-expect-error
      ChangeLogDataSource.instance = new ChangeLogDataSource({ modelOrCollection: getChangeLogModel() })
    }
    return ChangeLogDataSource.instance
  }
}
