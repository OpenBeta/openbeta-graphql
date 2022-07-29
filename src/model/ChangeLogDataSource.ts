import mongoose from 'mongoose'
import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'

import { getChangeLogModel } from '../db/index.js'
import { ChangeLogType, OpType, BaseChangeRecordType, AreaChangeLogType } from '../db/ChangeLogType'
import { logger } from '../logger.js'
import { areaHistoryDataSource } from './AreaHistoryDatasource.js'
export default class ChangeLogDataSource extends MongoDataSource<ChangeLogType> {
  changeLogModel = getChangeLogModel()

  /**
   * Create a new change set
   * @param uuid
   * @param operation
   * @returns
   */
  async create (uuid: MUUID, operation: OpType): Promise<ChangeLogType> {
    const newChangeDoc: ChangeLogType = {
      _id: new mongoose.Types.ObjectId(),
      editedBy: uuid,
      operation,
      changes: []
    }
    const rs = await this.changeLogModel.insertMany(newChangeDoc)
    if (rs?.length !== 1) throw new Error('Error inserting new change')
    return rs[0]
  }

  /**
   * Record a new change in the changeset
   * @param changeRecord
   */
  async record (changeRecord: BaseChangeRecordType): Promise<this> {
    const filter = {
      _id: changeRecord.fullDocument._change?.changeId
    }

    const rs = await this.changeLogModel.updateOne(filter,
      {
        $push: { changes: changeRecord }
      }, {
        upsert: false
      })

    if (rs.matchedCount < 1) {
      logger.error(changeRecord.fullDocument, 'Change Id not found.  Ignore change.')
    }
    return this
  }

  async getAreaChangeSets (areaUuid = null): Promise<AreaChangeLogType[]> {
    return await areaHistoryDataSource.getChangeSetsByUuid(areaUuid)
  }

  async _testRemoveAll (): Promise<void> {
    await this.changeLogModel.deleteMany()
  }
}

// TS error bug: https://github.com/GraphQLGuide/apollo-datasource-mongodb/issues/88
// @ts-expect-error
// eslint-disable-next-line
export const changelogDataSource = new ChangeLogDataSource(getChangeLogModel())
