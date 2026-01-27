import muuid from 'uuid-mongodb'
import { getAreaModel, getChangeLogModel } from '../../db/index.js'
import ChangeLogDataSource from '../ChangeLogDataSource.js'
import { OpType } from '../../db/ChangeLogType.js'
import { OperationType } from '../../db/AreaTypes.js'

import { logger } from '../../logger.js'
import inMemoryDB from '../../utils/inMemoryDB.js'

describe('Area history', () => {
  let changeLog: ChangeLogDataSource

  beforeAll(async () => {
    await inMemoryDB.connect()

    try {
      await getAreaModel().collection.drop()
      await getChangeLogModel().collection.drop()
    } catch (e) {
      logger.info('Expected exception')
    }

    changeLog = ChangeLogDataSource.getInstance()
  })

  afterAll(async () => {
    await inMemoryDB.close()
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
