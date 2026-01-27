import { ApolloServer } from '@apollo/server'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'
import { queryAPI, setUpServer } from '../utils/testUtils.js'
import { muuidToString } from '../utils/helpers.js'
import { InMemoryDB } from '../utils/inMemoryDB.js'
import express from 'express'
import UserDataSource from '../model/UserDataSource.js'

jest.setTimeout(60000)

describe('E2E tests for user queries', () => {
  let server: ApolloServer
  let user: muuid.MUUID
  let userUuid: string
  let app: express.Application
  let inMemoryDB: InMemoryDB
  let userDs: UserDataSource

  beforeAll(async () => {
    ({ server, inMemoryDB, app } = await setUpServer())
    // Auth0 serializes uuids in "relaxed" mode, resulting in this hex string format
    // "59f1d95a-627d-4b8c-91b9-389c7424cb54" instead of base64 "WfHZWmJ9S4yRuTicdCTLVA==".
    user = muuid.mode('relaxed').v4()
    userUuid = muuidToString(user)
  })

  beforeEach(async () => {
    await inMemoryDB.clear()
    userDs = UserDataSource.getInstance()
    const res = await userDs.createOrUpdateUserProfile(user, {
      userUuid,
      username: 'iwannaclimbv17oneday',
      email: 'gumby@openbeta.io',
      displayName: 'jared'
    })

    expect(res).toBe(true)
  })

  afterAll(async () => {
    await server.stop()
    await inMemoryDB.close()
  })
  it('can resolve a user public profile by their uuid', async () => {
    const response = await queryAPI({
      query: `
            query User($input: UserIDInput!) {
                getUserPublicProfileByUuid(input: $input) {
                  userUuid
                  username
                }
            }
            `,
      operationName: 'User',
      variables: {
        input: {
          userUuid
        }
      },
      userUuid,
      app
    })

    expect(response.error).toBe(false)
    expect(response.statusCode).toBe(200)
    expect(response.body.errors).toBeFalsy()
    const user = response.body.data.getUserPublicProfileByUuid
    expect(user.username).toBe('iwannaclimbv17oneday')
  })

  describe('user query', () => {
    const userQuery = `
      query User($input: LocateUserBy!) {
        user(input: $input) {
          userUuid
          username
        }
      }
    `

    it('can resolve a user public profile by supplying username', async () => {
      const response = await queryAPI({
        query: userQuery,
        operationName: 'User',
        variables: {
          input: {
            username: 'iwannaclimbv17oneday'
          }
        },
        userUuid,
        app
      })

      expect(response.error).toBe(false)
      expect(response.statusCode).toBe(200)
      expect(response.body.errors).toBeFalsy()
      const user = response.body.data.user
      expect(user.username).toBe('iwannaclimbv17oneday')
    })

    it('can resolve a user public profile by supplying UUID', async () => {
      const response = await queryAPI({
        query: userQuery,
        operationName: 'User',
        variables: {
          input: {
            userUuid
          }
        },
        userUuid,
        app
      })

      expect(response.error).toBe(false)
      expect(response.statusCode).toBe(200)
      expect(response.body.errors).toBeFalsy()
      const user = response.body.data.user
      expect(user.username).toBe('iwannaclimbv17oneday')
    })

    it('will error when no input is given', async () => {
      const response = await queryAPI({
        query: userQuery,
        operationName: 'User',
        variables: {
          input: {
          }
        },
        userUuid,
        app
      })

      expect(response.error).toBe(false)
      expect(response.statusCode).toBe(200)
      expect(response.body.errors).toBeTruthy()
    })

    it('will prefer uuid if both are supplied', async () => {
      const response = await queryAPI({
        query: userQuery,
        operationName: 'User',
        variables: {
          input: {
            userUuid,
            username: 'some bunk name (**&%&*'
          }
        },
        userUuid,
        app
      })

      expect(response.error).toBe(false)
      expect(response.statusCode).toBe(200)
      expect(response.body.errors).toBeFalsy()
      const user = response.body.data.user
      expect(user.username).toBe('iwannaclimbv17oneday')
    })
  })

  describe('page variants', () => {
    const userPageQuery = `
        query User($input: LocateUserBy!) {
          userPage(input: $input) {
            profile {
              userUuid
              username
            }
          }
        }
      `

    it('can resolve a user public page by supplying username', async () => {
      const response = await queryAPI({
        query: userPageQuery,
        operationName: 'User',
        variables: {
          input: {
            username: 'iwannaclimbv17oneday'
          }
        },
        userUuid,
        app
      })

      if (response.error !== false) {
        throw response.error
      }

      expect(response.statusCode).toBe(200)
      expect(response.body.errors).toBeFalsy()
      const user = response.body.data.userPage.profile
      expect(user.username).toBe('iwannaclimbv17oneday')
    })

    it('can resolve a user public page by supplying UUID', async () => {
      const response = await queryAPI({
        query: userPageQuery,
        operationName: 'User',
        variables: {
          input: {
            userUuid
          }
        },
        userUuid,
        app
      })

      expect(response.error).toBe(false)
      expect(response.statusCode).toBe(200)
      expect(response.body.errors).toBeFalsy()
      const user = response.body.data.userPage.profile
      expect(user.username).toBe('iwannaclimbv17oneday')
    })

    it('will error when no input is given', async () => {
      const response = await queryAPI({
        query: userPageQuery,
        operationName: 'User',
        variables: {
          input: {
          }
        },
        userUuid,
        app
      })

      expect(response.error).toBe(false)
      expect(response.statusCode).toBe(200)
      expect(response.body.errors).toBeTruthy()
    })

    it('will prefer uuid if both are supplied', async () => {
      const response = await queryAPI({
        query: userPageQuery,
        operationName: 'User',
        variables: {
          input: {
            userUuid,
            username: 'some bunk name (**&%&*'
          }
        },
        userUuid,
        app
      })

      expect(response.error).toBe(false)
      expect(response.statusCode).toBe(200)
      expect(response.body.errors).toBeFalsy()
      const user = response.body.data.userPage.profile
      expect(user.username).toBe('iwannaclimbv17oneday')
    })
  })
})
