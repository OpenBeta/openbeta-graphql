import muuid from 'uuid-mongodb'
import { DataSourcesType, ContextWithAuth } from '../../types'
import { GetUsernameReturn, User } from '../../db/UserTypes'

const UserQueries = {

  usernameExists: async (_, { username }, { dataSources }): Promise<boolean> => {
    const { users }: DataSourcesType = dataSources
    return await users.usernameExists(username)
  },

  getUsername: async (_, { userUuid }, { dataSources }): Promise<GetUsernameReturn | null> => {
    const { users }: DataSourcesType = dataSources
    const uuid = muuid.from(userUuid)
    return await users.getUsername(uuid)
  },

  getUserProfile: async (_, { userUuid }, { dataSources }: ContextWithAuth): Promise<User | null> => {
    const { users }: DataSourcesType = dataSources
    const uuid = muuid.from(userUuid)
    return await users.getUserProfile(uuid)
  }
}

export default UserQueries
