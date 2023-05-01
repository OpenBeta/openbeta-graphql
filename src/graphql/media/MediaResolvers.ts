import { CompleteAreaTag, CompleteClimbTag, MediaByUsers, RefModelType, TagEntryResultType, TagType, BaseTagType, SimpleTag, MediaWithTags } from '../../db/MediaTypes.js'
import AreaDataSource from '../../model/AreaDataSource.js'
import { getUserNickFromMediaDir } from '../../utils/helpers.js'

const BaseTagResolvers = {
  id: (node: BaseTagType) => node._id,
  mediaUuid: (node: BaseTagType) => node.mediaUuid.toUUID().toString(),
  destination: (node: BaseTagType) => node.destinationId.toUUID().toString(),
  username: async (node: BaseTagType) => await getUserNickFromMediaDir(node.mediaUrl.substring(3, 39))
}

const MediaResolvers = {

  TagEntryResult: {
    __resolveType (obj: TagEntryResultType) {
      if (obj.onModel === RefModelType.climbs) {
        return 'ClimbTag'
      }
      if (obj.onModel === RefModelType.areas) {
        return 'AreaTag'
      }
      return null
    }
  },

  BaseTag: {
    ...BaseTagResolvers
  },

  MediaTag: {
    __resolveType (obj: TagType) {
      if (obj.onModel === RefModelType.climbs) {
        return 'ClimbTag'
      }
      if (obj.onModel === RefModelType.areas) {
        return 'AreaTag'
      }
      return null
    }
  },

  ClimbTag: {
    ...BaseTagResolvers,
    climb: async (node: CompleteClimbTag, _: any, { dataSources }) => {
      const { areas }: { areas: AreaDataSource } = dataSources
      try {
        return await areas.findOneClimbByUUID(node.destinationId)
      } catch (e) {
        return null
      }
    }
  },

  AreaTag: {
    ...BaseTagResolvers,
    area: async (node: CompleteAreaTag, _: any, { dataSources }) => {
      const { areas }: { areas: AreaDataSource } = dataSources
      try {
        return await areas.findOneAreaByUUID(node.destinationId)
      } catch (e) {
        return null
      }
    }
  },

  MediaByUsers: {
    userUuid: (node: MediaByUsers) => node.userUuid.toUUID().toString(),
    username: async (node: MediaByUsers) => (
      await getUserNickFromMediaDir(node.userUuid.toUUID().toString()))
  },

  MediaWithTags: {
    username: async (node: MediaWithTags) => await getUserNickFromMediaDir(node.mediaUrl.substring(3, 39)),
    climbTags: (node: MediaWithTags) => node?.climbTags ?? [],
    areaTags: (node: MediaWithTags) => node?.areaTags ?? []
  },

  SimpleTag: {
    targetId: (node: SimpleTag) => node.targetId.toUUID().toString()
  },

  // MediaListByAuthorType: {
  //   authorUuid: (node: MediaByUsers) => node._id
  // },

  DeleteTagResult: {
    // nothing to override
  }
}

export default MediaResolvers
