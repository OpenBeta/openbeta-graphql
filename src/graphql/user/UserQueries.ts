import muuid from 'uuid-mongodb'
import { DataSourcesType, ContextWithAuth } from '../../types'
import { GetUsernameReturn, User } from '../../db/UserTypes'

const UserQueries = {

  usernameExists: async (_, { input }, { dataSources }): Promise<boolean> => {
    const { users }: DataSourcesType = dataSources
    return await users.usernameExists(input.username)
  },

  getUsername: async (_, { input }, { dataSources }): Promise<GetUsernameReturn | null> => {
    const { users }: DataSourcesType = dataSources
    const uuid = muuid.from(input.userUuid)
    return await users.getUsername(uuid)
  },

  getUserProfile: async (_, { input }, { dataSources }: ContextWithAuth): Promise<User | null> => {
    const { users }: DataSourcesType = dataSources
    const uuid = muuid.from(input.userUuid)
    return await users.getUserProfile(uuid)
  }
}

export default UserQueries
