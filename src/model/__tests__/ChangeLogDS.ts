import mongoose from 'mongoose'
import { jest } from '@jest/globals'
import muuid from 'uuid-mongodb'
import { connectDB, getChangeLogModel, getAreaModel } from '../../db/index.js'
import ChangeLogDataSource from '../ChangeLogDataSource.js'
import { OpType } from '../../db/ChangeLogType.js'
import { OperationType } from '../../db/AreaTypes.js'

import { logger } from '../../logger.js'

jest.setTimeout(10000)

describe('Area history', () => {
  let changeLog: ChangeLogDataSource

  beforeAll(async () => {
    await connectDB()

    try {
      await getAreaModel().collection.drop()
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
    const userId = muuid.v4()
    const op: OpType = OperationType.addCountry

    const session = await getChangeLogModel().startSession()
    const ret = await changeLog.create(session, userId, op)

    expect(ret._id).toBeDefined()
    expect(ret.editedBy).toEqual(userId)
    expect(ret.operation).toEqual(op)
    expect(ret.changes).toHaveLength(0)
  })
})
