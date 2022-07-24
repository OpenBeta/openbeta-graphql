import mongoose from 'mongoose'
import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'

import { getChangeLogModel } from '../db/index.js'
import { ChangeLogType, OpType } from '../db/ChangeLogType'

export default class ChangeLogDataSource extends MongoDataSource<ChangeLogType> {
  changeLogModel = getChangeLogModel()

  /**
   * Record a change
   * @param uuid
   * @param operation
   * @param cols
   * @returns
   */
  async record (uuid: MUUID, operation: OpType, cols: string[]): Promise<ChangeLogType> {
    const newChangeDoc: ChangeLogType = {
      _id: new mongoose.Types.ObjectId(),
      cols,
      operation,
      editedBy: uuid
    }
    const rs = await this.changeLogModel.insertMany(newChangeDoc)
    if (rs?.length !== 1) throw new Error('Error inserting new change')
    return rs[0]
  }
}
