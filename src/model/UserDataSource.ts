import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'
import differenceInDays from 'date-fns/differenceInDays'

import { logger } from '../logger.js'
import { getUserModel } from '../db/index.js'
import { User, UpdateProfileGQLInput, UsernameInfo, UsernameTupple } from '../db/UserTypes.js'

const USERNAME_UPDATE_WAITING_IN_DAYS = 14

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

  /**
   * Update username.  Create a new user object if not defined.
   * @returns true if successful
   */
  async updateUsername ({ userUuid, username, displayName }: UpdateProfileGQLInput): Promise<boolean> {
    if (username == null && displayName == null) {
      throw new Error('Nothing to update. Must provide at least one field.')
    }

    if ((username?.trim() ?? '') === '' && ((displayName?.trim() ?? '') === '')) {
      throw new Error('Nothing to update. Must provide at least one field.')
    }

    if (username != null && !isValidUsername(username)) {
      throw new Error('Invalid username format.')
    }

    const rs = await this.userModel.findOne({ userUuid })

    const isNew = rs == null

    if (isNew) {
      let usernameInfo: UsernameInfo | null = null

      if (username != null) {
        usernameInfo = {
          username,
          updatedAt: new Date()
        }
      }

      await this.userModel.insertMany(
        [{
          userUuid,
          ...displayName != null && { displayName: displayName.trim() },
          ...usernameInfo != null && { usernameInfo }
        }])

      return true
    }

    const usernameInfo = rs?.usernameInfo

    if (username != null && username !== usernameInfo?.username) {
      const lastUpdated = usernameInfo?.updatedAt ?? new Date()
      const lastUpdatedInDays = UserDataSource.calculateLastUpdatedInDays(lastUpdated)
      if (lastUpdatedInDays < USERNAME_UPDATE_WAITING_IN_DAYS) {
        const waitDays = USERNAME_UPDATE_WAITING_IN_DAYS - lastUpdatedInDays
        throw new Error(`Too frequent update.  Please wait ${waitDays.toString()} days.`)
      }

      rs.set('usernameInfo.username', username)
    }

    if (displayName != null && displayName !== rs.displayName) {
      rs.displayName = displayName
    }

    await rs.save()
    return true
  }

  /**
   * Get username from user uuid
   * @param userUuid
   */
  async getUsername (userUuid: MUUID): Promise<UsernameTupple | null> {
    /**
     * Why find() instead of findOne()?
     * With findOne() there's an additional LIMIT stage.
     * The query isn't covered by indexes.
     * See https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
     */
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

  /**
   * Get user profile data by user id
   * @param userUuid
   */
  async getUser (userUuid: MUUID): Promise<User | null> {
    const rs = await this.userModel
      .findOne(
        { userUuid },
        {
          _id: 0,
          __v: 0
        }).lean()

    return rs
  }

  static calculateLastUpdatedInDays (lastUpdated: Date): number {
    return differenceInDays(Date.now(), lastUpdated.getTime())
  }
}

const regUsername = /^[a-zA-Z0-9]+([_\\.-]?[a-zA-Z0-9])*$/i
const regUsernameKeywords = /openbeta|0penbeta|admin/i

/**
 * Username validation
 * Only does format validation, does not check against database
 * or anything like that.
 *
 * @param username
 * @returns true if has valid format
 */
export const isValidUsername = (username: string): boolean => {
  return username != null && username.length <= 30 &&
  !regUsernameKeywords.test(username) &&
  regUsername.test(username)
}
