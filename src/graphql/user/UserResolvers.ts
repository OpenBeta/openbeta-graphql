import { User } from '../../db/UserTypes.js'

const UserResolvers = {

  UsernameInfo: {
    userUuid: (node: User) => node.userUuid.toUUID().toString()
  }

  // MediaWithTags: {
  //   id: (node: MediaObject) => node._id,
  //   username: async (node: MediaObject) => (
  //     await getUserNickFromMediaDir(node.userUuid.toUUID().toString())),
  //   uploadTime: (node: MediaObject) => node.createdAt
  // }

}

export default UserResolvers
