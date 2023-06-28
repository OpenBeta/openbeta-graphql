import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'

import { connectDB, getUserModel } from '../../db/index.js'
import UserDataSource from '../UserDataSource.js'
import { UpdateProfileGQLInput } from '../../db/UserTypes.js'

describe('UserDataSource', () => {
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
    const updater = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: userUuid.toUUID().toString(),
      username: 'cat',
      email: 'cat@example.com'
    }

    let u = await users.getUsername(userUuid)

    expect(u).toBeNull()

    await users.createOrUpdateUserProfile(updater, input)

    u = await users.getUsername(muuid.from(input.userUuid))

    expect(u?._id.toUUID().toString()).toEqual(userUuid.toUUID().toString())
    expect(u?.username).toEqual(input.username)
    expect(u?.updatedAt.getTime() ?? 0).toBeGreaterThan(0)
    expect(u?.updatedAt.getTime()).toBeLessThan(Date.now())
  })

  it('should create a new user from username and other updatable fields', async () => {
    const updater = muuid.v4()
    const userUuid = muuid.v4()
    const username = 'new-test-profile'
    const input: UpdateProfileGQLInput = {
      userUuid: userUuid.toUUID().toString(),
      username,
      displayName: 'jane doe',
      bio: 'this is a test profile',
      website: 'https://example.com',
      email: 'cat@example.com'
    }

    const u = await users.getUsername(userUuid)

    expect(u).toBeNull()

    await users.createOrUpdateUserProfile(updater, input)

    const u2 = await users.getUserPublicProfile(username)

    // check selected fields
    expect(u2).toMatchObject({
      username: input.username,
      displayName: input.displayName,
      bio: input.bio,
      website: input.website,
      email: input.email
    })

    expect(u2?._id.toUUID().toString()).toEqual(input.userUuid)
  })

  it('should require an email when creating new profile', async () => {
    const updater = muuid.v4()
    const userUuid = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: userUuid.toUUID().toString(),
      username: 'woof'
    }

    await expect(
      users.createOrUpdateUserProfile(updater, input)
    ).rejects.toThrowError(/Email is required/i)
  })

  it('should enforce a waiting period for username update', async () => {
    const updater = muuid.v4()
    const userUuid = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: userUuid.toUUID().toString(),
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
    const userUuid = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: userUuid.toUUID().toString(),
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

    const updatedUser = await users.getUserPublicProfileByUuid(muuid.from(newInput.userUuid))

    expect(updatedUser?.username).toEqual(newInput.username)
  })

  it('should reject invalid website url', async () => {
    const updater = muuid.v4()
    const userUuid = muuid.v4()
    const input: UpdateProfileGQLInput = {
      userUuid: userUuid.toUUID().toString(),
      website: 'badurl',
      email: 'cat@example.com'
    }

    await expect(
      users.createOrUpdateUserProfile(updater, input)
    ).rejects.toThrowError(/invalid website/i)
  })
})
