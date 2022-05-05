import { MediaType, RefModelType } from '../../db/MediaTypes.js'
const MediaResolvers = {
  MediaTagType: {
    mediaUuid: (node: MediaType) => node.mediaUuid.toUUID().toString(),
    destination: (node: MediaType) => node.destinationId
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
