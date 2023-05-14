import { User, GetUsernameReturn } from '../../db/UserTypes.js'

const UserResolvers: object = {

  UserProfile: {
    userUuid: (node: User) => node.userUuid.toUUID().toString()
  },

  Username: {
    lastUpdated: (node: GetUsernameReturn) => node.updatedAt
  },

  UsernameMapping: {
    userUuid: (node: GetUsernameReturn) => node.userUuid.toUUID().toString(),
    lastUpdated: (node: GetUsernameReturn) => node.updatedAt
  }
}

export default UserResolvers
