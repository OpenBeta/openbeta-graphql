import { ApolloServer } from 'apollo-server'
import muuid from 'uuid-mongodb'
import TickDataSource, { createInstance as createTickInstance } from '../../../../../model/TickDataSource'
import { setUpServer } from '../../../../../utils/testUtils.js'
import { muuidToString } from '../../../../../utils/helpers.js'
import { onConnected } from '../ConvertTickDateClimbedToDate'

describe('ConvertTickDateClimbedToDate migration', () => {
  let server: ApolloServer
  let user: muuid.MUUID
  let userUuid: string
  let inMemoryDB

  // Mongoose models for mocking pre-existing state.
  let ticks: TickDataSource

  beforeAll(async () => {
    ({ server, inMemoryDB } = await setUpServer())
    user = muuid.mode('relaxed').v4()
    userUuid = muuidToString(user)

    await inMemoryDB.clear()
    ticks = createTickInstance()
  })

  afterAll(async () => {
    await server.stop()
    await inMemoryDB.close()
  })

  // This will throw an error due to multiple Mongoose connections.
  // To test locally, comment out `void connectDB(onConnected)` in ../ConvertTickDateClimbedToDate
  it.skip('migrates dateClimbed from string to date', async () => {
    // Mock data in existing state where dateClimbed is a string.
    const docs = [{
      name: 'myclimbname',
      notes: 'sent first go',
      climbId: '1900180017001600',
      userId: userUuid,
      style: 'sport',
      attemptType: '',
      dateClimbed: '2022-12-01',
      grade: '5.10',
      source: 'MP'
    }]
    await inMemoryDB.insertDirectly('ticks', docs)

    // Run migration
    await onConnected()

    // Verify migration worked
    const tickRes = await ticks.ticksByUser(userUuid)
    expect(tickRes).toHaveLength(1)
    console.log(tickRes[0])
    expect(tickRes[0].dateClimbed).toEqual(new Date('2022-12-01'))
    // ^ Somehow timezone setting doesn't work in local Mongo -- so these get converted to UTC.
  })
})
