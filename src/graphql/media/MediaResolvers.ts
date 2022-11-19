import { MediaListByAuthorType, MediaType, RefModelType, AreaTagType, DeleteTagResult, TagEntryResultType } from '../../db/MediaTypes.js'
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
    mediaUuid: (node: DeleteTagResult) => node.mediaUuid.toUUID().toString(),
    destinationId: (node: DeleteTagResult) => node.destinationId.toUUID().toString()
  },

  MediaListByAuthorType: {
    authorUuid: (node: MediaListByAuthorType) => node._id
  },

  ClimbTag: {
    mediaUuid: (node: AreaTagType) => node.mediaUuid.toUUID().toString()
  },

  AreaTag: {
    mediaUuid: (node: AreaTagType) => node.mediaUuid.toUUID().toString()
  }
}

export default MediaResolvers
