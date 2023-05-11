import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'

import { logger } from '../logger.js'
import { getUserModel } from '../db/index.js'
import { User, UsernameLookupReturn } from '../db/UserTypes.js'

const USERNAME_UPDATE_FREQUENCY_RESTRICTION = 14 // 14 days

interface UsernameQueryReturnType {
  username: string
}
export default class UserDataSource extends MongoDataSource<User> {
  userModel = getUserModel()

  async createUser ({ userUuid }): Promise<boolean> {
    const currentTs = new Date()
    await this.userModel.updateOne({ userUuid }, {
      $setOnInsert: {
        userUuid,
        createdAt: currentTs,
        updatedAt: currentTs
      }
    }, { upsert: true, timestamps: false }).lean()
    return true
  }

  async updateUsername ({ userUuid, username }): Promise<boolean> {
    const rs = await this.userModel.findOne({ userUuid })

    if (rs == null) {
      throw new Error('User not found')
    }

    // const lastUpdated = rs?.usernameInfo?.updatedAt ?? new Date()
    // if (lastUpdated <
    rs.usernameInfo = {
      updatedAt: new Date(),
      username
    }
    await rs.save()
    return true
  }

  async getUsername (userUuid: MUUID): Promise<UsernameLookupReturn | null> {
    const rs = await this.userModel
      .find<UsernameQueryReturnType>(
      { userUuid },
      {
        username: '$usernameInfo.username',
        _id: 0
      }).lean()

    if (rs != null && rs.length === 1) {
      // @ts-expect-error
      const username = rs[0]?.username
      if (username == null) {
        logger.error(`Unexpected error.  UsernameInfo object should be defined for ${userUuid.toUUID().toString()}`)
        return null
      }
      return {
        userUuid,
        username
      }
    }
    return null
  }
}
