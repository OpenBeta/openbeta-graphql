import { MediaByUsers, SimpleTag, MediaWithTags, TagByUser } from '../../db/MediaTypes.js'
import { getUserNickFromMediaDir } from '../../utils/helpers.js'

const MediaResolvers = {

  MediaByUsers: {
    userUuid: (node: MediaByUsers) => node.userUuid.toUUID().toString(),
    username: async (node: MediaByUsers) => (
      await getUserNickFromMediaDir(node.userUuid.toUUID().toString()))
  },

  MediaWithTags: {
    username: async (node: MediaWithTags) => (
      await getUserNickFromMediaDir(node.userUuid.toUUID().toString())),
    climbTags: (node: MediaWithTags) => node?.climbTags ?? [],
    areaTags: (node: MediaWithTags) => node?.areaTags ?? [],
    uploadTime: (node: MediaWithTags) => node.createdAt
  },

  SimpleTag: {
    targetId: (node: SimpleTag) => node.targetId.toUUID().toString()
  },

  DeleteTagResult: {
    // nothing to override
  },

  TagsByUser: {
    userUuid: (node: TagByUser) => node.userUuid.toUUID().toString(),
    username: async (node: TagByUser) => (
      await getUserNickFromMediaDir(node.userUuid.toUUID().toString()))
  }

}

export default MediaResolvers
