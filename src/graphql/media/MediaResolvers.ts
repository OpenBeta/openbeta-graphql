import { MediaListByAuthorType, MediaType, RefModelType } from '../../db/MediaTypes.js'
const MediaResolvers = {
  MediaTagType: {
    mediaUuid: (node: MediaType) => node.mediaUuid.toUUID().toString(),
    destination: (node: MediaType) => node.destinationId.toUUID().toString()
  },

  TagEntryResult: {
    __resolveType (obj) {
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
    mediaUuid: (node: MediaType) => node.mediaUuid.toUUID().toString(),
    // destinationId now contains the actual climb object. See Mongoose 'populate()'.
    climb: (node: any) => node.destinationId
  },

  AreaTag: {
    mediaUuid: (node: MediaType) => node.mediaUuid.toUUID().toString(),
    // destinationId now contains the actual area object. See Mongoose 'populate()'.
    area: (node: any) => node.destinationId
  }
}

export default MediaResolvers
