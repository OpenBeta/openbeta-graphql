import { EntityTag, MediaByUsers, MediaObject, TagByUser } from '../../db/MediaObjectTypes'
import { geojsonPointToLatitude, geojsonPointToLongitude } from '../../utils/helpers'
import { DataSourcesType } from '../../types'

const MediaResolvers = {

  MediaByUsers: {
    userUuid: (node: MediaByUsers) => node.userUuid.toUUID().toString(),
    username:
    async (node: MediaByUsers, _: any, { dataSources }) => {
      const { users } = dataSources as DataSourcesType
      const u = await users.getUsername(node.userUuid)
      return u?.username ?? null
    }
  },

  MediaWithTags: {
    id: (node: MediaObject) => node._id,
    username: async (node: MediaObject, _: any, { dataSources }) => {
      const { users } = dataSources as DataSourcesType
      const u = await users.getUsername(node.userUuid)
      return u?.username ?? null
    },
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
    username: async (node: TagByUser, _: any, { dataSources }) => {
      const { users } = dataSources as DataSourcesType
      const u = await users.getUsername(node.userUuid)
      return u?.username ?? null
    }
  }
}

export default MediaResolvers
