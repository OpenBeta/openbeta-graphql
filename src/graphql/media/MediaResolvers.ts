import { MediaListByAuthorType, MediaType, RefModelType, ClimbTagType, AreaTagType } from '../../db/MediaTypes.js'
const MediaResolvers = {
  MediaTagType: {
    mediaUuid: (node: MediaType) => node.mediaUuid.toUUID().toString(),
    destination: (node: MediaType) => node.destinationId.toUUID().toString()
  },

  TagEntryResult: {
    __resolveType (obj: MediaType) {
      if (obj.onModel === RefModelType.climbs) {
        return 'ClimbTag'
      }
      if (obj.onModel === RefModelType.areas) {
        return 'AreaTag'
      }
      return null
    }
  },

  MediaListByAuthorType: {
    authorUuid: (node: MediaListByAuthorType) => node._id
  },

  ClimbTag: {
    mediaUuid: (node: AreaTagType) => node.mediaUuid.toUUID().toString(),
    // destinationId now contains the actual climb object. See Mongoose 'populate()'.
    climb: (node: ClimbTagType) => node.destinationId
  },

  AreaTag: {
    mediaUuid: (node: AreaTagType) => node.mediaUuid.toUUID().toString(),
    // destinationId now contains the actual area object. See Mongoose 'populate()'.
    area: (node: AreaTagType) => node.destinationId
  }
}

export default MediaResolvers
