import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'

import { connectDB, getUserModel } from '../../db/index.js'
import UserDataSource from '../UserDataSource.js'
import { UsernameTupple, UpdateProfileGQLInput } from '../../db/UserTypes.js'

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

  it('should create a new user with username', async () => {
    const input: UsernameTupple = {
      username: 'cat',
      userUuid: muuid.v4()
    }

    let u = await users.getUsername(input.userUuid)

    expect(u).toBeNull()

    await users.updateUsername(input)

    u = await users.getUsername(input.userUuid)

    expect(u).toEqual(input)
  })

  it('should create a new user from username and other fields', async () => {
    const input: UpdateProfileGQLInput = {
      username: 'user1',
      displayName: 'user one',
      userUuid: muuid.v4()
    }

    const u = await users.getUsername(input.userUuid)

    expect(u).toBeNull()

    await users.updateUsername(input)

    const u2 = await users.getUser(input.userUuid)

    expect(u2).toMatchObject({
      userUuid: input.userUuid.toUUID().toBinary(),
      usernameInfo: {
        username: input.username
      }
    })
  })

  it('should create a new user with display name', async () => {
    const input: UpdateProfileGQLInput = {
      displayName: 'jane doe',
      userUuid: muuid.from('b9f8ab3b-e6e5-4467-9adb-65d91c7ebe7c')
    }

    const u = await users.getUsername(input.userUuid)

    expect(u).toBeNull()

    await users.updateUsername(input)

    const u2 = await users.getUser(input.userUuid)

    // check selected fields
    expect(u2).toMatchObject({
      ...input,
      userUuid: input.userUuid.toUUID().toBinary()
    })

    // explicitly verify that usernameInfo subdocument is undefined
    expect(u2?.usernameInfo).toBeUndefined()
  })

  it('should enforce waiting period for updating username', async () => {
    const input: UsernameTupple = {
      username: 'woof',
      userUuid: muuid.v4()
    }

    await users.updateUsername(input)

    await expect(
      users.updateUsername({
        userUuid: input.userUuid,
        username: 'woof1234'
      })
    ).rejects.toThrowError(/frequent update/i)
  })

  it('should allow username update after the waiting period', async () => {
    const input: UsernameTupple = {
      username: 'winnie',
      userUuid: muuid.v4()
    }

    await users.updateUsername(input)

    jest
      .spyOn(UserDataSource, 'calculateLastUpdatedInDays')
      .mockImplementation(() => 14)

    const newInput = {
      userUuid: input.userUuid,
      username: 'pooh'
    }
    await users.updateUsername(newInput)

    const updatedUser = await users.getUser(input.userUuid)

    expect(updatedUser?.usernameInfo?.username).toEqual(newInput.username)
  })
})
