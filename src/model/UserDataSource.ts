import { MongoDataSource } from 'apollo-datasource-mongodb'
import muid, { MUUID } from 'uuid-mongodb'
import mongoose from 'mongoose'
import differenceInDays from 'date-fns/differenceInDays/index.js'

import { getUserModel } from '../db/index.js'
import {
  User,
  UpdateProfileGQLInput,
  UsernameInfo,
  GetUsernameReturn,
  UserPublicProfile
} from '../db/UserTypes.js'
import { trimToNull } from '../utils/sanitize.js'
import { canonicalizeUsername } from '../utils/helpers.js'

const USERNAME_UPDATE_WAITING_IN_DAYS = 14

export default class UserDataSource extends MongoDataSource<User> {
  static PUBLIC_PROFILE_PROJECTION = {
    _id: 1,
    username: '$usernameInfo.username',
    displayName: 1,
    bio: 1,
    website: 1,
    avatar: 1,
    email: 1
  }

  userModel = getUserModel()

  /**
   * Check to see if a username exists.
   * @param username
   * @returns true if exists
   */
  async usernameExists (username: string): Promise<boolean> {
    const _username = trimToNull(username)
    if (_username == null) {
      return false
    }
    try {
      const rs = await this.userModel.find(
        {
          'usernameInfo.canonicalName': {
            $exists: true, $eq: canonicalizeUsername(_username)
          }
        },
        {
          _id: 0,
          'usernameInfo.canonicalName': 1
        }).lean()
      return rs?.length > 0
    } catch (e) {
      return true // assume the username exists in case of an unexpected error
    }
  }

  /**
   * Update user profile.  Create a new user object if not defined.
   * @param updater UUID of the account doing the update
   * @param input profile params
   * @returns true if successful
   */
  async createOrUpdateUserProfile (
    updater: MUUID,
    input: UpdateProfileGQLInput
  ): Promise<boolean> {
    const {
      username: _username,
      displayName: _displayName,
      bio: _bio,
      website: _website,
      avatar: _avatar,
      email,
      userUuid
    } = input

    if (Object.keys(input).length === 0) {
      throw new Error('Nothing to update. Must provide at least one field.')
    }

    if (_username != null && !isValidUsername(_username)) {
      throw new Error('Invalid username format.')
    }

    const username = trimToNull(_username)
    const displayName = trimToNull(_displayName)
    const bio = trimToNull(_bio)
    const website = trimToNull(_website)
    const avatar = trimToNull(_avatar)

    const _id = muid.from(userUuid)
    if (
      username == null &&
      displayName == null &&
      bio == null &&
      website == null &&
      avatar == null
    ) {
      throw new Error('Nothing to update. Must provide at least one field.')
    }

    if (website != null && !isValidUrl(website)) {
      throw new Error('Invalid website address.')
    }

    const rs = await this.userModel.findOne({ _id })

    const isNew = rs == null

    if (isNew) {
      if (email == null) {
        throw new Error('Email is required when creating a new profile')
      }
      let usernameInfo: UsernameInfo | null = null

      if (username != null) {
        usernameInfo = {
          username,
          canonicalName: canonicalizeUsername(username),
          updatedAt: new Date()
        }
      }

      await this.userModel.insertMany([
        {
          _id,
          email,
          ...(displayName != null && { displayName }),
          ...(usernameInfo != null && { usernameInfo }),
          ...(bio != null && { bio }),
          ...(website != null && { website }),
          ...(avatar != null && { avatar }),
          emailVerified: true,
          updatedBy: updater
        }
      ])

      return true
    }

    const usernameInfo = rs?.usernameInfo

    if (username != null && username !== usernameInfo?.username) {
      const lastUpdated = usernameInfo?.updatedAt ?? new Date()
      const lastUpdatedInDays =
        UserDataSource.calculateLastUpdatedInDays(lastUpdated)
      if (lastUpdatedInDays < USERNAME_UPDATE_WAITING_IN_DAYS) {
        const daysToWait = USERNAME_UPDATE_WAITING_IN_DAYS - lastUpdatedInDays
        throw new Error(
          `Too frequent update.  Please wait ${daysToWait.toString()} more days.`
        )
      }

      rs.set('usernameInfo.username', username)
      rs.set('usernameInfo.canonicalName', canonicalizeUsername(username))
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

    if (avatar != null && avatar !== rs.avatar) {
      rs.avatar = avatar
    }

    rs.updatedBy = updater

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
      .find<GetUsernameReturn>(
      { _id: userUuid },
      {
        _id: 1,
        username: '$usernameInfo.username',
        updatedAt: '$usernameInfo.updatedAt'
      }
    ).lean()

    if (rs?.length === 1) {
      // @ts-expect-error
      return rs[0]
    }
    return null
  }

  /**
   * Get user public profile by userUuid
   * @param userUuid
   */
  async getUserPublicProfileByUuid (userUuid: MUUID): Promise<UserPublicProfile | null> {
    return await this.userModel.findOne({ _id: userUuid }, UserDataSource.PUBLIC_PROFILE_PROJECTION).lean()
  }

  /**
   * Get user profile data by user name
   * @param username username
   */
  async getUserPublicProfile (username: string): Promise<UserPublicProfile | null> {
    if (!isValidUsername(username)) {
      throw new Error('Invalid username')
    }
    return await this.userModel.findOne<UserPublicProfile>(
      {
        'usernameInfo.username': {
          $exists: true, $eq: username
        }
      },
      UserDataSource.PUBLIC_PROFILE_PROJECTION
    ).lean()
  }

  static calculateLastUpdatedInDays (lastUpdated: Date): number {
    return differenceInDays(Date.now(), lastUpdated.getTime())
  }

  static instance: UserDataSource

  static getInstance (): UserDataSource {
    if (UserDataSource.instance == null) {
      UserDataSource.instance = new UserDataSource(mongoose.connection.db.collection('user'))
    }
    return UserDataSource.instance
  }
}

const regUsername = /^[a-zA-Z0-9]+([_\\.-]?[a-zA-Z0-9])*$/i
const regUsernameKeywords = /openbeta|0penbeta|admin|undefined|null/i

/**
 * Username validation
 *
 * @param username
 * @returns true if has valid format
 */
const isValidUsername = (username?: string): boolean => {
  return (
    username != null &&
    username.length <= 30 &&
    username.length >= 2 &&
    !regUsernameKeywords.test(username) &&
    regUsername.test(username)
  )
}

const isValidUrl = (url: string): boolean => {
  try {
    const newUrl = new URL(url)
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:'
  } catch (e) {
    return false
  }
}
