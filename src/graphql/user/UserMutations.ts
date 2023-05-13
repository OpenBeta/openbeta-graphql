import muid from 'uuid-mongodb'
import { DataSourcesType, ContextWithAuth } from '../../types.js'
import { UpdateProfileGQLInput } from '../../db/UserTypes.js'

const UserMutations = {
  createUser: async (_: any, { input }, { dataSources }) => {
    const { users: user }: DataSourcesType = dataSources
    const { userUuid } = input
    return await user.createUser({ userUuid })
  },

  updateUserProfile: async (_: any, { input }, { dataSources, user: authenticatedUser }: ContextWithAuth) => {
    const { users }: DataSourcesType = dataSources
    const { username, displayName } = input as UpdateProfileGQLInput

    const userUuid = muid.from('b9f8ab3b-e6e5-4467-9adb-65d91c7ebe7c')
    return await users.updateUsername({ userUuid, username, displayName })
  }

}

export default UserMutations
