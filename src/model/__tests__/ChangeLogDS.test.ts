import muuid from 'uuid-mongodb'
import { getChangeLogModel } from '../../db/index.js'
import { OpType } from '../../db/ChangeLogType.js'
import { OperationType } from '../../db/AreaTypes.js'
import { dbTest as it } from '../../__tests__/fixtures/mongo.fixtures.js'

describe('Area history', () => {
  it('should create a change record', async ({ changeLog }) => {
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
