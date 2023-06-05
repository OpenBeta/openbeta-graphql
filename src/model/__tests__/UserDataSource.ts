import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'

import { connectDB, getUserModel } from '../../db/index.js'
import UserDataSource from '../UserDataSource.js'
import { UpdateProfileGQLInput } from '../../db/UserTypes.js'

const testUserID = 'b9f8ab3b-e6e5-4467-9adb-65d91c7ebe7c'

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
    const updater = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: testUserID,
      username: 'cat',
      email: 'cat@example.com'
    }

    let u = await users.getUsername(muuid.from(input.userUuid))

    expect(u).toBeNull()

    await users.createOrUpdateUserProfile(updater, input)

    u = await users.getUsername(muuid.from(input.userUuid))

    expect(u).toMatchObject({
      _id: input.userUuid,
      username: input.username
    })
    expect(u?.updatedAt.getTime() ?? 0).toBeGreaterThan(0)
    expect(u?.updatedAt.getTime()).toBeLessThan(Date.now())
  })

  it('should create a new user from username and other updatable fields', async () => {
    const updater = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: testUserID,
      username: 'user1',
      displayName: 'user one',
      email: 'cat@example.com'
    }

    const u = await users.getUsername(muuid.from(input.userUuid))

    expect(u).toBeNull()

    await users.createOrUpdateUserProfile(updater, input)

    const u2 = await users.getUserProfile(muuid.from(input.userUuid))

    expect(u2).toMatchObject({
      _id: muuid.from(input.userUuid),
      displayName: input.displayName,
      usernameInfo: {
        username: input.username
      },
      emailVerified: true,
      updatedBy: updater.toUUID().toBinary()
    })
  })

  it('should create a new user without username', async () => {
    const updater = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: testUserID,
      displayName: 'jane doe',
      bio: 'test profile',
      website: 'https://example.com',
      email: 'cat@example.com'
    }

    const u = await users.getUsername(muuid.from(input.userUuid))

    expect(u).toBeNull()

    await users.createOrUpdateUserProfile(updater, input)

    const u2 = await users.getUserProfile(muuid.from(input.userUuid))

    // check selected fields
    expect(u2).toMatchObject({
      ...input,
      _id: muuid.from(input.userUuid)
    })

    expect(u2?.emailVerified).toBeUndefined()

    // explicitly verify that usernameInfo subdocument is undefined
    expect(u2?.usernameInfo).toBeUndefined()
  })

  it('should require an email when creating new profile', async () => {
    const updater = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: testUserID,
      username: 'woof'
    }

    await expect(
      users.createOrUpdateUserProfile(updater, input)
    ).rejects.toThrowError(/Email is required/i)
  })

  it('should enforce a waiting period for username update', async () => {
    const updater = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: testUserID,
      username: 'woof',
      email: 'cat@example.com'
    }

    await users.createOrUpdateUserProfile(updater, input)

    await expect(
      users.createOrUpdateUserProfile(updater, {
        userUuid: input.userUuid,
        username: 'woof1234'
      })
    ).rejects.toThrowError(/frequent update/i)
  })

  it('should allow username update after the waiting period', async () => {
    const updater = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: testUserID,
      username: 'winnie',
      email: 'cat@example.com'
    }

    await users.createOrUpdateUserProfile(updater, input)

    jest
      .spyOn(UserDataSource, 'calculateLastUpdatedInDays')
      .mockImplementation(() => 14)

    const newInput: UpdateProfileGQLInput = {
      userUuid: input.userUuid,
      username: 'pooh',
      bio: 'I\'m a bear'
    }
    await users.createOrUpdateUserProfile(updater, newInput)

    const updatedUser = await users.getUserProfile(muuid.from(newInput.userUuid))

    expect(updatedUser?.usernameInfo?.username).toEqual(newInput.username)
  })

  it('should reject invalid website url', async () => {
    const updater = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: testUserID,
      website: 'badurl',
      email: 'cat@example.com'
    }

    await expect(
      users.createOrUpdateUserProfile(updater, input)
    ).rejects.toThrowError(/invalid website/i)
  })
})
