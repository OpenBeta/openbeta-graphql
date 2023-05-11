// import { Binary } from 'mongodb'
import muuid from 'uuid-mongodb'
import { DataSourcesType } from '../../types'

const UserQueries = {
  getUsername: async (_, { userUuid }, { dataSources }): Promise<any> => {
    const { users }: DataSourcesType = dataSources
    const uuid = muuid.from(userUuid)
    return await users.getUsername(uuid)
  }
}

export default UserQueries
