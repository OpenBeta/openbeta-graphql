import { ApolloServer } from '@apollo/server'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'
import MutableMediaDataSource from '../model/MutableMediaDataSource.js'
import { MediaObject, MediaObjectGQLInput } from '../db/MediaObjectTypes.js'
import { queryAPI, setUpServer } from '../utils/testUtils.js'
import { muuidToString } from '../utils/helpers.js'
import { InMemoryDB } from '../utils/inMemoryDB.js'
import express from 'express'
import UserDataSource from '../model/UserDataSource.js'

jest.setTimeout(60000)

describe('E2E tests to validate behavior of media queries', () => {
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

  async function insertMediaObjects (mediaCount: number): Promise<MediaObject[]> {
    const newMediaListInput: MediaObjectGQLInput[] = []
    for (let i = 0; i < mediaCount; i++) {
      newMediaListInput.push({
        userUuid,
        width: 800,
        height: 600,
        format: 'jpeg',
        size: 45000,
        mediaUrl: `/areaPhoto${i}.jpg`
      })
    }

    const media = MutableMediaDataSource.getInstance()
    return await media.addMediaObjects(newMediaListInput)
  }

  describe('media queries', () => {
    it('can resolve known media', async () => {
      const [object] = await insertMediaObjects(1)
      const response = await queryAPI({
        query: `
              query Media($input: MediaInput) {
                  media(input: $input) {
                        id
                      mediaUrl
                  }
              }
              `,
        operationName: 'Media',
        variables: {
          input: {
            id: object._id.toString()
          }
        },
        userUuid,
        app
      })

      expect(response.statusCode).toBe(200)
      expect(response.error).toBe(false)
      const mediaResult = response.body.data.media
      expect(mediaResult.id).toBe(object._id.toHexString())
    })

    it('Media resolver can yield a simple username', async () => {
      const [object] = await insertMediaObjects(1)
      const response = await queryAPI({
        query: `
              query Media($input: MediaInput) {
                  media(input: $input) {
                      id
                      mediaUrl
                      username
                  }
              }
              `,
        operationName: 'Media',
        variables: {
          input: {
            id: object._id.toString()
          }
        },
        userUuid,
        app
      })

      expect(response.statusCode).toBe(200)
      expect(response.error).toBe(false)
      console.log(response)
      const mediaResult = response.body.data.media
      expect(mediaResult.id).toBe(object._id.toHexString())
      expect(mediaResult.mediaUrl).toBeTruthy()
      expect(mediaResult.username).not.toBeNull()
      expect(mediaResult.username).not.toBeUndefined()
    })

    it('Media resolver can yield a user node', async () => {
      const [object] = await insertMediaObjects(1)
      const response = await queryAPI({
        query: `
            query Media($input: MediaInput) {
                media(input: $input) {
                    id
                    mediaUrl
                    user {
                        username
                    }
                }
            }
            `,
        operationName: 'Media',
        variables: {
          input: {
            id: object._id.toString()
          }
        },
        userUuid,
        app
      })

      expect(response.statusCode).toBe(200)
      expect(response.error).toBe(false)
      console.log(response)
      const mediaResult = response.body.data.media
      expect(mediaResult.id).toBe(object._id.toHexString())
      expect(mediaResult.mediaUrl).toBeTruthy()
      console.log(mediaResult)
      expect(mediaResult.user).not.toBeNull()
      expect(mediaResult.user.username).toBe('iwannaclimbv17oneday')
    })
  })
})
