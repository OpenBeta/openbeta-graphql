import { AreaTagType, ClimbTagType, MediaListByAuthorType, MediaType, RefModelType, TagEntryResultType } from '../../db/MediaTypes.js'
const MediaResolvers = {
  MediaTagType: {
    mediaUuid: (node: MediaType) => node.mediaUuid.toUUID().toString(),
    destination: (node: MediaType) => node.destinationId.toUUID().toString()
  },

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

  DeleteTagResult: {
    // nothing to override
  },

  MediaListByAuthorType: {
    authorUuid: (node: MediaListByAuthorType) => node._id
  },

  ClimbTag: {
    id: (node: ClimbTagType) => node._id.toString(),
    mediaUuid: (node: ClimbTagType) => node.mediaUuid.toUUID().toString()
  },

  AreaTag: {
    id: (node: AreaTagType) => node._id.toString(),
    mediaUuid: (node: AreaTagType) => node.mediaUuid.toUUID().toString()
  }
}

export default MediaResolvers
