import { MongoDataSource } from 'apollo-datasource-mongodb'
import { MUUID } from 'uuid-mongodb'
import differenceInDays from 'date-fns/differenceInDays/index.js'

import { getUserModel } from '../db/index.js'
import { User, UpdateProfileGQLInput, UsernameInfo, GetUsernameReturn } from '../db/UserTypes.js'
import { trimToNull } from '../utils/sanitize.js'

const USERNAME_UPDATE_WAITING_IN_DAYS = 14

interface UsernameQueryReturnType {
  username?: string
  createdAt?: string
  userUuid: string
}
export default class UserDataSource extends MongoDataSource<User> {
  userModel = getUserModel()

  /**
   * Update user profile.  Create a new user object if not defined.
   * @param userUuid userUuid to update/add
   * @param input profile params
   * @returns true if successful
   */
  async createOrUpdateUserProfile (userUuid: MUUID, input: UpdateProfileGQLInput): Promise<boolean> {
    const { username: _username, displayName: _displayName, bio: _bio, website: _website } = input

    if (Object.keys(input).length === 0) {
      throw new Error('Nothing to update. Must provide at least one field.')
    }

    const username = trimToNull(_username)
    const displayName = trimToNull(_displayName)
    const bio = trimToNull(_bio)
    const website = trimToNull(_website)

    if (username == null && displayName == null && bio == null && website == null) {
      throw new Error('Nothing to update. Must provide at least one field.')
    }

    if (username != null && !isValidUsername(username)) {
      throw new Error('Invalid username format.')
    }

    if (website != null && !isValidUrl(website)) {
      throw new Error('Invalid website address.')
    }

    const rs = await this.userModel.findOne({ _id: userUuid })

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
          _id: userUuid,
          ...displayName != null && { displayName: displayName.trim() },
          ...usernameInfo != null && { usernameInfo },
          ...bio != null && { bio },
          ...website != null && { website }
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

    if (website != null && website !== rs.website) {
      rs.website = website
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
      { _id: userUuid },
      {
        _id: 1,
        username: '$usernameInfo.username',
        updatedAt: '$usernameInfo.updatedAt'
      }
    ).lean()

    if (rs != null && rs.length === 1) {
      // @ts-expect-error
      return rs[0]
    }
    return null
  }

  /**
   * Get user profile data by user id
   * @param userUuid
   */
  async getUserProfile (userUuid: MUUID): Promise<User | null> {
    const rs = await this.userModel
      .findOne({ _id: userUuid }).lean()

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
const isValidUsername = (username: string): boolean => {
  return username != null && username.length <= 30 &&
  !regUsernameKeywords.test(username) &&
  regUsername.test(username)
}

const isValidUrl = (url: string): boolean => {
  try {
    const newUrl = new URL(url)
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:'
  } catch (e) {
    return false
  }
}
