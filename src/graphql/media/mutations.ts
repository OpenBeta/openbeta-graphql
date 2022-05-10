import muid from 'uuid-mongodb'
import { UserInputError } from 'apollo-server'

import { MediaType, RefModelType } from '../../db/MediaTypes.js'
import { getMediaModel, getClimbModel } from '../../db/index.js'

const MediaMutations = {
  setTag: async (_, { input }) => {
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
    try {
      // Check whether the climb referenced this tag exists before we allow
      // the tag to be added
      const climb = await getClimbModel().exists({ _id: doc.destinationId })
      if (climb == null) {
        throw new UserInputError(`Climb with id: ${destinationId.toString()} doesn't exist`)
      }
      return await media
        .findOneAndUpdate({ mediaUuid: doc.mediaUuid, destinationId }, doc, { new: true, upsert: true })
        .populate('destinationId').lean()
    } catch (e) {
      if (e.code === 11000) {
        throw new UserInputError('Duplicated mediaUuid and destinationId')
      }
      throw e
    }
  },

  removeTag: async (_, { mediaUuid, destinationId }) => {
    const rs = await getMediaModel().deleteOne({ mediaUuid: muid.from(mediaUuid), destinationId: muid.from(destinationId) })
    if (rs?.deletedCount === 1) return { mediaUuid, destinationId, removed: true }
    return { mediaUuid, destinationId, removed: false }
  }
}

export default MediaMutations
