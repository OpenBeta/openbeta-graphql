import { CompleteAreaTag, CompleteClimbTag, MediaListByAuthorType, RefModelType, TagEntryResultType, TagType, TagWithMediaMetaType } from '../../db/MediaTypes.js'
import AreaDataSource from '../../model/AreaDataSource.js'
import { getUserNickFromMediaDir } from '../../utils/helpers.js'

const BaseTagResolvers = {
  id: (node: TagWithMediaMetaType) => node._id,
  mediaUuid: (node: TagWithMediaMetaType) => node.mediaUuid.toUUID().toString(),
  destination: (node: TagWithMediaMetaType) => node.destinationId.toUUID().toString(),
  username: async (node: TagWithMediaMetaType) => await getUserNickFromMediaDir(node.mediaUrl.substring(3, 39)),
  width: (node: TagWithMediaMetaType) => node.width,
  height: (node: TagWithMediaMetaType) => node.height
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

  MediaListByAuthorType: {
    authorUuid: (node: MediaListByAuthorType) => node._id
  },

  // ClimbTag: {
  //   id: (node: ClimbTagType) => node._id.toString(),
  //   mediaUuid: (node: ClimbTagType) => node.mediaUuid.toUUID().toString()
  // },

  // AreaTag: {
  //   id: (node: AreaTagType) => node._id.toString(),
  //   mediaUuid: (node: AreaTagType) => node.mediaUuid.toUUID().toString()
  // },

  DeleteTagResult: {
    // nothing to override
  }
}

export default MediaResolvers
