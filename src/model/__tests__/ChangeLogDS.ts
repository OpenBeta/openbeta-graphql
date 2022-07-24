import mongoose from 'mongoose'
import { jest } from '@jest/globals'
import muuid from 'uuid-mongodb'
import { connectDB, createIndexes, getChangeLogModel } from '../../db/index.js'
import ChangeLogDataSource from '../ChangeLogDataSource.js'
import { ChangeLogType, OpType } from '../../db/ChangeLogType.js'
import { OperationType } from '../../db/AreaTypes.js'

import { logger } from '../../logger.js'

jest.setTimeout(10000)

describe('Area history', () => {
  let changeLog: ChangeLogDataSource

  beforeAll(async () => {
    await connectDB()

    try {
      await getChangeLogModel().collection.drop()
    } catch (e) {
      logger.info('Expected exception')
    }

    changeLog = new ChangeLogDataSource(
      mongoose.connection.db.collection(
        getChangeLogModel().modelName)
    )
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should create a change record', async () => {
    const uid = muuid.v4()
    const op: OpType = OperationType.addArea
    const ret = await changeLog.record(uid, op, ['foo', 'bar'])
    expect(ret._id).toBeDefined()
    expect(ret.editedBy).toEqual(uid)
    expect(ret.operation).toEqual(op)
    expect(ret.cols).toEqual(['foo', 'bar'])
  })
})
