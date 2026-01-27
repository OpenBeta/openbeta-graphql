import muuid from 'uuid-mongodb'
import { GraphQLError } from 'graphql'

import { DataSourcesType, ContextWithAuth, GQLContext } from '../../types.js'
import { GetUsernameReturn, UserPublicProfile, UserPublicPage } from '../../db/UserTypes.js'

const UserQueries = {
  user: async (_: any, { input }, { dataSources }: ContextWithAuth): Promise<UserPublicProfile> => {
    const { users }: DataSourcesType = dataSources

    let uuid = (input.userUuid !== undefined) && muuid.from(input.userUuid)
    if (uuid === false) {
      if (input.username === undefined) {
        throw new Error('Supply either UUID (preferred) or username')
      }
      uuid = await users.uuidFromUsername(input.username)
    }

    const profile = await users.getUserPublicProfileByUuid(uuid)

    if (profile === null) {
      throw new Error('The requested user has no ascociated public profile')
    }

    return profile
  },

  userPage: async (_: any, { input }, { dataSources }: ContextWithAuth): Promise<UserPublicPage> => {
    const { users, media: mediaDS }: DataSourcesType = dataSources

    let uuid = (input.userUuid !== undefined) && muuid.from(input.userUuid)
    if (uuid === false) {
      uuid = await users.uuidFromUsername(input.username)
    }

    const profile = await users.getUserPublicProfileByUuid(uuid)
    if (profile == null) {
      throw new GraphQLError('User profile not found.', {
        extensions: {
          code: 'NOT_FOUND'
        }
      })
    }

    const media = await mediaDS.getOneUserMediaPagination({ userUuid: profile._id })
    return {
      profile,
      media
    }
  },

  usernameExists: async (_: any, { input }, { dataSources }): Promise<boolean> => {
    const { users }: DataSourcesType = dataSources
    return await users.usernameExists(input.username)
  },

  getUsername: async (_: any, { input }, { dataSources }): Promise<GetUsernameReturn | null> => {
    const { users }: DataSourcesType = dataSources
    const uuid = muuid.from(input.userUuid)
    return await users.getUsername(uuid)
  },

  getUserPublicProfileByUuid: async (_: any, { input }, { dataSources }: ContextWithAuth): Promise<UserPublicProfile | null> => {
    const { users }: DataSourcesType = dataSources
    const uuid = muuid.from(input.userUuid)
    return await users.getUserPublicProfileByUuid(uuid)
  },

  getUserPublicPage: async (_: any, { input }, { dataSources }: GQLContext): Promise<UserPublicPage | null> => {
    const { users, media: mediaDS }: DataSourcesType = dataSources
    const profile = await users.getUserPublicProfile(input.username)
    if (profile == null) {
      throw new GraphQLError('User profile not found.', {
        extensions: {
          code: 'NOT_FOUND'
        }
      })
    }
    const media = await mediaDS.getOneUserMediaPagination({ userUuid: profile._id })
    return {
      profile,
      media
    }
  }
}

export default UserQueries
