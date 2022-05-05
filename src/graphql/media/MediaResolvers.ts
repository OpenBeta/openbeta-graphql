import { MediaType, RefModelType } from '../../db/MediaTypes.js'
const MediaResolvers = {
  MediaTagType: {
    mediaUuid: (node: MediaType) => node.mediaUuid.toUUID().toString(),
    destination: (node: MediaType) => node.destinationId
  },

  TagEntryResult: {
    __resolveType (obj) {
      console.log('#obj type', obj)
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
    // destinationId now contains the actual climb object. See Mongoose 'populate()'.
    climb: (node: any) => node.destinationId
  },

  AreaTag: {
    // destinationId now contains the actual area object. See Mongoose 'populate()'.
    area: (node: any) => node.destinationId
  }
}

export default MediaResolvers
