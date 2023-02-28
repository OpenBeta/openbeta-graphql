// For clarity in this example we included our typeDefs and resolvers above our test,

import { ApolloServer } from 'apollo-server'
import { createTestGqlServer } from './serverutils'
import mongoose from 'mongoose'
import { connectDB, defaultPostConnect } from '../../db'

let testServer: ApolloServer

const user = {
  uuid: 'klein-binnendijk',
  // no need of roles for ticks
  roles: []
}

const dummyTick = {
  name: 'Small Dog',
  notes: 'Sandbagged',
  climbId: 'c76d2083-6b8f-524a-8fb8-76e1dc79833f',
  style: 'Lead',
  attemptType: 'Onsight',
  dateClimbed: '12/12/12',
  grade: '5.7',
  source: 'MP'
}

describe('Ticks have a couple of context related behaviors', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB(defaultPostConnect)
    }
    testServer = await createTestGqlServer()
  })

  afterAll(async () => {
    await testServer.stop()
    await mongoose.connection.close()
  })

  it('Tests the creation of Ticks', async () => {
    if (testServer === null) throw new Error('Test server not initialized')

    const resp = await testServer.executeOperation({
      query: 'mutation AddTheTick($tick: Tick) { addTick(input: $tick) { userId } }',
      variables: {
        tick: dummyTick
      }
    })

    // We expect no errors, and the userId to be the same as the one we sent
    expect(resp.errors).toBeUndefined()
  })

  it('Tests the creation of Ticks, but SHOULD fail because user context is not present', async () => {
    if (testServer === null) throw new Error('Test server not initialized')

    const resp = await testServer.executeOperation({
      query: 'mutation AddTheTick($tick: Tick) { addTick(input: $tick) { userId } }',
      variables: {
        tick: dummyTick
      }
    })

    expect(resp.errors).not.toBeUndefined()
    expect(resp.errors?.length).toBe(1)
    expect(resp.errors?.[0].message.includes('not authenticated')).toBe(true)
  })

  it('Tests the deletion of Ticks', async () => {
    if (testServer === null) throw new Error('Test server not initialized')
  })

  it('Tests the deleteAllTicks', async () => {
    if (testServer === null) throw new Error('Test server not initialized')
  })

  it('Tests the editing of ticks', async () => {
    if (testServer === null) throw new Error('Test server not initialized')
  })
})
