import { User, GetUsernameReturn } from '../../db/UserTypes.js'

const UserResolvers: object = {

  UserProfile: {
    userUuid: (node: User) => node._id.toUUID().toString()
  },

  Username: {
    lastUpdated: (node: GetUsernameReturn) => node.updatedAt
  },

  UsernameMapping: {
    userUuid: (node: GetUsernameReturn) => node._id.toUUID().toString(),
    lastUpdated: (node: GetUsernameReturn) => node.updatedAt
  }
}

export default UserResolvers
