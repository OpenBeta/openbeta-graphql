import { DataSourcesType } from '../../types.js'

const UserMutations = {
  createUser: async (_: any, { input }, { dataSources }) => {
    const { users: user }: DataSourcesType = dataSources
    const { userUuid } = input
    return await user.createUser({ userUuid })
  },
  updateUsername: async (_: any, { input }, { dataSources }) => {
    const { users: user }: DataSourcesType = dataSources
    const { userUuid, username } = input
    return await user.updateUsername({ userUuid, username })
  }

}

export default UserMutations
