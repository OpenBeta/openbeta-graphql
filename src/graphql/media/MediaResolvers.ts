import { EntityTag, MediaByUsers, MediaObject } from '../../db/MediaObjectType.js'
import { TagByUser } from '../../db/MediaTypes.js'
import { getUserNickFromMediaDir, geojsonPointToLatitude, geojsonPointToLongitude } from '../../utils/helpers.js'

const MediaResolvers = {

  MediaByUsers: {
    userUuid: (node: MediaByUsers) => node.userUuid.toUUID().toString(),
    username: async (node: MediaByUsers) => (
      await getUserNickFromMediaDir(node.userUuid.toUUID().toString()))
  },

  MediaWithTags: {
    id: (node: MediaObject) => node._id,
    username: async (node: MediaObject) => (
      await getUserNickFromMediaDir(node.userUuid.toUUID().toString())),
    uploadTime: (node: MediaObject) => node.createdAt
  },

  EntityTag: {
    id: (node: EntityTag) => node._id,
    targetId: (node: EntityTag) => node.targetId.toUUID().toString(),
    lat: (node: EntityTag) => geojsonPointToLatitude(node.lnglat),
    lng: (node: EntityTag) => geojsonPointToLongitude(node.lnglat)
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
