import muid from 'uuid-mongodb'

import { MediaType, RefModelType } from '../../db/MediaTypes.js'
import { getMediaModel } from '../../db/index.js'

const MediaMutations = {
  setTags: async (_, { input }) => {
    const { mediaUuid, mediaType, mediaUrl, destType, destinationId }: MediaType = input

    let modelType: RefModelType
    switch (destType) {
      case 0: modelType = RefModelType.climbs
        break
      case 1: modelType = RefModelType.areas
        break
      default: modelType = RefModelType.climbs
    }

    const doc: MediaType = {
      mediaUuid: muid.from(mediaUuid),
      mediaType,
      mediaUrl,
      destType: destType,
      destinationId: muid.from(destinationId),
      onModel: modelType
    }
    const media = getMediaModel()
    return await media.findOneAndUpdate({ mediaUuid: doc.mediaUuid, destinationId }, doc, { new: true, upsert: true })
  }
}

export default MediaMutations
