import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'

import { connectDB, getUserModel } from '../../db/index.js'
import UserDataSource from '../UserDataSource.js'
import { UpdateProfileGQLInput } from '../../db/UserTypes.js'

describe('MediaDataSource', () => {
  let users: UserDataSource

  beforeAll(async () => {
    await connectDB()
    const userModel = getUserModel()
    try {
      await userModel.collection.drop()
    } catch (e) {
      console.log('Cleaning up db before test')
    }
    await userModel.ensureIndexes()
    users = new UserDataSource(mongoose.connection.db.collection('users'))
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create a new user with just username', async () => {
    const userUuid = muuid.v4()
    const input: UpdateProfileGQLInput = {
      username: 'cat'
    }

    let u = await users.getUsername(userUuid)

    expect(u).toBeNull()

    await users.createOrUpdateUserProfile(userUuid, input)

    u = await users.getUsername(userUuid)

    expect(u).toMatchObject({ ...input, userUuid })
    expect(u?.updatedAt.getTime() ?? 0).toBeGreaterThan(0)
    expect(u?.updatedAt.getTime()).toBeLessThan(Date.now())
  })

  it('should create a new user from username and other fields', async () => {
    const userUuid = muuid.v4()
    const input: UpdateProfileGQLInput = {
      username: 'user1',
      displayName: 'user one'
    }

    const u = await users.getUsername(userUuid)

    expect(u).toBeNull()

    await users.createOrUpdateUserProfile(userUuid, input)

    const u2 = await users.getUserProfile(userUuid)

    expect(u2).toMatchObject({
      userUuid: userUuid.toUUID().toBinary(),
      displayName: input.displayName,
      usernameInfo: {
        username: input.username
      }
    })
  })

  it('should create a new user without username', async () => {
    const userUuid = muuid.v4()
    const input: UpdateProfileGQLInput = {
      displayName: 'jane doe',
      bio: 'test profile',
      homepage: 'https://example.com'
    }

    const u = await users.getUsername(userUuid)

    expect(u).toBeNull()

    await users.createOrUpdateUserProfile(userUuid, input)

    const u2 = await users.getUserProfile(userUuid)

    // check selected fields
    expect(u2).toMatchObject({
      ...input,
      userUuid: userUuid.toUUID().toBinary()
    })

    // explicitly verify that usernameInfo subdocument is undefined
    expect(u2?.usernameInfo).toBeUndefined()
  })

  it('should enforce waiting period for username update', async () => {
    const userUuid = muuid.v4()
    const input: UpdateProfileGQLInput = {
      username: 'woof'
    }

    await users.createOrUpdateUserProfile(userUuid, input)

    await expect(
      users.createOrUpdateUserProfile(userUuid, {
        username: 'woof1234'
      })
    ).rejects.toThrowError(/frequent update/i)
  })

  it('should allow username update after the waiting period', async () => {
    const userUuid = muuid.v4()
    const input: UpdateProfileGQLInput = {
      username: 'winnie'
    }

    await users.createOrUpdateUserProfile(userUuid, input)

    jest
      .spyOn(UserDataSource, 'calculateLastUpdatedInDays')
      .mockImplementation(() => 14)

    const newInput = {
      username: 'pooh',
      bio: 'I\'m a bear'
    }
    await users.createOrUpdateUserProfile(userUuid, newInput)

    const updatedUser = await users.getUserProfile(userUuid)

    expect(updatedUser?.usernameInfo?.username).toEqual(newInput.username)
  })
})
