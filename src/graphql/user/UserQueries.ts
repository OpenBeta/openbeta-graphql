import muuid from 'uuid-mongodb'
import { DataSourcesType, ContextWithAuth } from '../../types'
import { GetUsernameReturn, User } from '../../db/UserTypes'

const UserQueries = {
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
