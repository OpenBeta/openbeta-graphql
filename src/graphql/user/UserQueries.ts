import muuid from 'uuid-mongodb'
import { GraphQLError } from 'graphql'

import { DataSourcesType, ContextWithAuth, Context } from '../../types'
import { GetUsernameReturn, UserPublicProfile, UserPublicPage } from '../../db/UserTypes'

const UserQueries = {

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

  getUserPublicPage: async (_: any, { input }, { dataSources }: Context): Promise<UserPublicPage | null> => {
    const { users, media }: DataSourcesType = dataSources
    const profile = await users.getUserPublicProfile(input.username)
    if (profile == null) {
      throw new GraphQLError('User profile not found.', {
        extensions: {
          code: 'NOT_FOUND'
        }
      })
    }
    const mediaList = await media.getOneUserMedia(profile._id.toUUID().toString(), 500)
    return {
      profile,
      mediaList
    }
  }
}

export default UserQueries
