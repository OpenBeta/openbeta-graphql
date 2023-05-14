import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'
import differenceInDays from 'date-fns/differenceInDays/index.js'

import { logger } from '../logger.js'
import { getUserModel } from '../db/index.js'
import { User, UpdateProfileGQLInput, UsernameInfo, GetUsernameReturn } from '../db/UserTypes.js'
import { trimToNull } from '../utils/sanitize.js'

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
   * @param userUuid userUuid to update/add
   * @param input profile params
   * @returns true if successful
   */
  async createOrUpdateUserProfile (userUuid: MUUID, input: UpdateProfileGQLInput): Promise<boolean> {
    const { username: _username, displayName: _displayName, bio: _bio, homepage: _homepage } = input

    if (Object.keys(input).length === 0) {
      throw new Error('Nothing to update. Must provide at least one field.')
    }

    const username = trimToNull(_username)
    const displayName = trimToNull(_displayName)
    const bio = trimToNull(_bio)
    const homepage = trimToNull(_homepage)

    if (username == null && displayName == null && bio == null && homepage == null) {
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
          ...usernameInfo != null && { usernameInfo },
          ...bio != null && { bio },
          ...homepage != null && { homepage }
        }])

      return true
    }

    const usernameInfo = rs?.usernameInfo

    if (username != null && username !== usernameInfo?.username) {
      const lastUpdated = usernameInfo?.updatedAt ?? new Date()
      const lastUpdatedInDays = UserDataSource.calculateLastUpdatedInDays(lastUpdated)
      if (lastUpdatedInDays < USERNAME_UPDATE_WAITING_IN_DAYS) {
        const waitDays = USERNAME_UPDATE_WAITING_IN_DAYS - lastUpdatedInDays
        throw new Error(`Too frequent update.  Please wait ${waitDays.toString()} more days.`)
      }

      rs.set('usernameInfo.username', username)
    }

    if (displayName != null && displayName !== rs.displayName) {
      rs.displayName = displayName
    }

    if (bio != null && bio !== rs.bio) {
      rs.bio = bio
    }

    if (homepage != null && homepage !== rs.homepage) {
      rs.homepage = homepage
    }

    await rs.save()
    return true
  }

  /**
   * Get username from user uuid
   * @param userUuid
   */
  async getUsername (userUuid: MUUID): Promise<GetUsernameReturn | null> {
    /**
     * Why find() instead of findOne()?
     * findOne() introduces an additional LIMIT stage.
     * The query isn't covered by indexes.
     * See https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
     */
    const rs = await this.userModel
      .find<UsernameQueryReturnType>(
      { userUuid }
    ).lean()

    if (rs != null && rs.length === 1) {
      const usernameInfo = rs[0].usernameInfo
      if (usernameInfo == null) {
        logger.error(`Unexpected error.  UsernameInfo object should be defined for ${userUuid.toUUID().toString()}`)
        return null
      }
      const { username, updatedAt } = usernameInfo
      return {
        userUuid,
        username,
        updatedAt
      }
    }
    return null
  }

  /**
   * Get user profile data by user id
   * @param userUuid
   */
  async getUserProfile (userUuid: MUUID): Promise<User | null> {
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
