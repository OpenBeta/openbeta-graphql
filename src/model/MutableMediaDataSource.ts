import { UserInputError } from 'apollo-server'
import { MUUID } from 'uuid-mongodb'

import { getMediaModel, getClimbModel, getAreaModel } from '../db/index.js'
import { MediaType, MediaInputType, RefModelType, TagEntryResultType, DeleteTagResult } from '../db/MediaTypes.js'
import MediaDataSource from './MediaDataSource.js'

const QUERY_OPTIONS = { upsert: true, new: true, overwrite: false }

export default class MutableAreaDataSource extends MediaDataSource {
  async setTag ({ mediaUuid, mediaType, mediaUrl, destType, destinationId }: MediaInputType): Promise<TagEntryResultType | null> {
    let modelType: RefModelType
    // const destUUID = muid.from(destinationId)
    const media = getMediaModel()

    switch (destType) {
      case 0: {
        modelType = RefModelType.climbs
        // Check whether the climb referencing this tag exists before we allow
        // the tag to be added
        const climb = await getClimbModel().exists({ _id: destinationId })
        if (climb == null) {
          throw new UserInputError(`Climb with id: ${destinationId.toUUID().toString()} doesn't exist`)
        }

        const doc: MediaType = {
          mediaUuid,
          mediaType,
          mediaUrl,
          destType,
          destinationId,
          onModel: modelType
        }

        const filter = { mediaUuid: doc.mediaUuid, destinationId }

        if (await media.exists(filter) != null) throw new UserInputError('Duplicate mediaUuid and destinationId not allowed')

        return await media
          .findOneAndUpdate(
            filter,
            doc,
            QUERY_OPTIONS)
          .populate('destinationId')
          .lean()
      }

      case 1: {
        modelType = RefModelType.areas
        // Check whether the area referencing this tag exists before we allow
        // the tag to be added
        const area = await getAreaModel().findOne({ 'metadata.area_id': destinationId }).lean()
        if (area == null) {
          throw new UserInputError(`Area with id: ${destinationId.toUUID().toString()} doesn't exist`)
        }

        const doc: MediaType = {
          mediaUuid,
          mediaType,
          mediaUrl,
          destType,
          destinationId,
          onModel: modelType
        }

        const filter = { mediaUuid: doc.mediaUuid, destinationId }

        if (await media.exists(filter) != null) throw new UserInputError('Duplicate mediaUuid and destinationId now allowed')

        const rs = await media
          .findOneAndUpdate(
            filter,
            doc,
            QUERY_OPTIONS)
          .lean()

        // @ts-expect-error-error
        rs.destinationId = area // mimic Mongoose popuplate()'
        // @ts-expect-error-error
        return rs
      }
      default: return null
    }
  }

  async removeTag (mediaUuid: MUUID, destinationId: MUUID): Promise<DeleteTagResult|null> {
    const rs = await getMediaModel().deleteOne({ mediaUuid, destinationId })
    if (rs?.deletedCount === 1) {
      return { mediaUuid, destinationId, removed: true }
    }
    return { mediaUuid, destinationId, removed: false }
  }
}
