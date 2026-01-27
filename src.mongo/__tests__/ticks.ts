import { ApolloServer } from '@apollo/server'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'
import { queryAPI, setUpServer } from '../utils/testUtils.js'
import { muuidToString } from '../utils/helpers.js'
import { TickInput } from '../db/TickTypes.js'
import TickDataSource from '../model/TickDataSource.js'
import UserDataSource from '../model/UserDataSource.js'
import { UpdateProfileGQLInput } from '../db/UserTypes.js'
import { InMemoryDB } from '../utils/inMemoryDB.js'
import express from 'express'
import MutableClimbDataSource from '../model/MutableClimbDataSource.js'
import MutableAreaDataSource from '../model/MutableAreaDataSource.js'
import { ClimbChangeInputType } from '../db/ClimbTypes.js'

jest.setTimeout(110000)

const newClimbsToAdd: ClimbChangeInputType[] = [
  {
    name: 'Sport 1',
    disciplines: {
      sport: true
    },
    description: 'The best climb',
    location: '5m left of the big tree',
    protection: '5 quickdraws'
  },
  {
    name: 'Deep water 1',
    disciplines: {
      deepwatersolo: true
    }
  }
]

describe('ticks API', () => {
  let server: ApolloServer
  let user: muuid.MUUID
  let userUuid: string
  let app: express.Application
  let inMemoryDB: InMemoryDB

  // Mongoose models for mocking pre-existing state.
  let ticks: TickDataSource
  let users: UserDataSource
  let tickOne: TickInput
  let climbs: MutableClimbDataSource
  let areas: MutableAreaDataSource

  beforeAll(async () => {
    ({ server, inMemoryDB, app } = await setUpServer())
    user = muuid.v4()
    userUuid = muuidToString(user)

    tickOne = {
      name: 'Route One',
      notes: 'Nice slab',
      climbId: 'tbd', // need to create a climb for tick validation
      userId: userUuid,
      style: 'Lead',
      attemptType: 'Onsight',
      dateClimbed: new Date('2016-07-20T17:30:15+05:30'),
      grade: '5.8',
      source: 'MP'
    }
  })

  beforeEach(async () => {
    ticks = TickDataSource.getInstance()
    users = UserDataSource.getInstance()
    climbs = MutableClimbDataSource.getInstance()
    areas = MutableAreaDataSource.getInstance()
    await inMemoryDB.clear()

    // Add climbs because add/update tick requires type validation
    await areas.addCountry('usa')
    const newDestination = await areas.addArea(user, 'California', null, 'usa')
    const routesArea = await areas.addArea(user, 'Sport & Trad', newDestination.metadata.area_id)

    const newIDs = await climbs.addOrUpdateClimbs(user, routesArea.metadata.area_id, newClimbsToAdd)
    // Update tick inputs with generated climb IDs
    tickOne.climbId = newIDs[0]
  })

  afterAll(async () => {
    await server.stop()
    await inMemoryDB.close()
  })

  describe('queries', () => {
    const userQuery = `
      query userTicks($userId: MUUID, $username: String) {
        userTicks(userId: $userId, username: $username) {
          _id
          name
          notes
          climbId
          style
          attemptType
          dateClimbed
          grade
          userId
        }
      }
    `
    const userTickByClimbQuery = `
      query userTicksByClimbId($userId: String, $climbId: String) {
        userTicksByClimbId(userId: $userId, climbId: $climbId) {
          _id
          name
          notes
          climbId
          style
          attemptType
          dateClimbed
          grade
          userId
        }
      }
    `

    it('queries by userId', async () => {
      const userProfileInput: UpdateProfileGQLInput = {
        userUuid,
        username: 'cat.dog',
        email: 'cat@example.com'
      }
      await users.createOrUpdateUserProfile(user, userProfileInput)
      await ticks.addTick(tickOne)
      const response = await queryAPI({
        query: userQuery,
        variables: { userId: userUuid },
        userUuid,
        app
      })
      expect(response.statusCode).toBe(200)
      const res = response.body.data.userTicks
      expect(res).toHaveLength(1)
      expect(res[0].name).toBe(tickOne.name)
    })

    it('queries by username', async () => {
      const userProfileInput: UpdateProfileGQLInput = {
        userUuid,
        username: 'cat.dog',
        email: 'cat@example.com'
      }
      await users.createOrUpdateUserProfile(user, userProfileInput)
      await ticks.addTick(tickOne)
      const response = await queryAPI({
        query: userQuery,
        variables: { username: 'cat.dog' },
        userUuid,
        app
      })
      expect(response.statusCode).toBe(200)
      const res = response.body.data.userTicks
      expect(res).toHaveLength(1)
      expect(res[0].name).toBe(tickOne.name)
    })

    it('queries by userId and climbId', async () => {
      await ticks.addTick(tickOne)
      const response = await queryAPI({
        query: userTickByClimbQuery,
        variables: { userId: userUuid, climbId: tickOne.climbId },
        userUuid,
        app
      })
      expect(response.statusCode).toBe(200)
      const res = response.body.data.userTicksByClimbId
      expect(res).toHaveLength(1)
      expect(res[0].name).toBe(tickOne.name)
    })
  })

  describe('mutations', () => {
    const createQuery = `
      mutation ($input: Tick!) {
        tick: addTick(input: $input) {
          _id
          name
          notes
          climbId
          userId
          style
          attemptType
          dateClimbed
          grade
          source
        }
      }
    `
    const updateQuery = `
      mutation ($input: TickFilter!) {
        tick: editTick(input: $input) {
          _id
          name
          notes
          climbId
          userId
          style
          attemptType
          dateClimbed
          grade
          source
        }
      }
    `
    it('creates and updates a tick', async () => {
      const createResponse = await queryAPI({
        query: createQuery,
        variables: { input: tickOne },
        userUuid,
        roles: ['user_admin'],
        app
      })

      expect(createResponse.statusCode).toBe(200)
      const createTickRes = createResponse.body.data.tick
      expect(createTickRes.name).toBe(tickOne.name)
      expect(createTickRes.notes).toBe(tickOne.notes)
      expect(createTickRes.climbId).toBe(tickOne.climbId)
      expect(createTickRes.userId).toBe(tickOne.userId)
      expect(createTickRes.style).toBe(tickOne.style)
      expect(createTickRes.attemptType).toBe(tickOne.attemptType)
      expect(createTickRes.dateClimbed).toBe(new Date(tickOne.dateClimbed).getTime())
      expect(createTickRes.grade).toBe(tickOne.grade)
      expect(createTickRes.source).toBe(tickOne.source)
      expect(createTickRes._id).toBeTruthy()

      const updateResponse = await queryAPI({
        query: updateQuery,
        variables: {
          input: {
            _id: createTickRes._id,
            updatedTick: {
              name: 'Updated Route One',
              climbId: tickOne.climbId,
              userId: userUuid,
              dateClimbed: new Date('2022-11-10T12:00:00Z'),
              grade: 'new grade',
              source: 'OB'
            }
          }
        },
        userUuid,
        roles: [], // ['user_admin'],
        app
      })

      expect(updateResponse.statusCode).toBe(200)
      expect(updateResponse.body.data.tick.name).toBe('Updated Route One')
    })
    it('verifies date formats correctly', async () => {
      const validDateTick = {
        ...tickOne,
        dateClimbed: new Date('2022-11-10T15:30:00Z').getTime()
      }
      const validResponse = await queryAPI({
        query: createQuery,
        variables: { input: validDateTick },
        userUuid,
        roles: ['user_admin'],
        app
      })
      expect(validResponse.statusCode).toBe(200)
      expect(validResponse.body.data.tick.dateClimbed)
        .toBe(new Date('2022-11-10T15:30:00Z').getTime())
    })
  })
})
