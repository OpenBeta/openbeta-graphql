import { MongoDataSource } from 'apollo-datasource-mongodb'
import { UserInputError } from 'apollo-server'
import muid from 'uuid-mongodb'

import { getMediaModel, getClimbModel, getAreaModel } from '../db/index.js'
import { MediaType, RefModelType } from '../db/MediaTypes.js'

export default class AreaDataSource extends MongoDataSource<MediaType> {
  async setTag ({ mediaUuid, mediaType, mediaUrl, destType, destinationId }: MediaType): Promise<any> {
    let modelType: RefModelType
    const destUUID = muid.from(destinationId)
    const media = getMediaModel()

    try {
      switch (destType) {
        case 0: {
          modelType = RefModelType.climbs
          // Check whether the climb referencing this tag exists before we allow
          // the tag to be added
          const climb = await getClimbModel().exists({ _id: destUUID })
          if (climb == null) {
            throw new UserInputError(`Climb with id: ${destUUID.toUUID.toString()} doesn't exist`)
          }

          const doc: MediaType = {
            mediaUuid: muid.from(mediaUuid),
            mediaType,
            mediaUrl,
            destType: destType,
            destinationId: destUUID,
            onModel: modelType
          }

          return await media
            .findOneAndUpdate({ mediaUuid: doc.mediaUuid, destinationId: doc.destinationId }, doc, { new: true, upsert: false, overwrite: false })
            .populate('destinationId').lean()
        }
        case 1: {
          modelType = RefModelType.areas
          // Check whether the area referencing this tag exists before we allow
          // the tag to be added
          const area = await getAreaModel().findOne({ 'metadata.area_id': destUUID }).lean()
          if (area == null) {
            throw new UserInputError(`Area with id: ${destUUID.toString()} doesn't exist`)
          }

          const doc: MediaType = {
            mediaUuid: muid.from(mediaUuid),
            mediaType,
            mediaUrl,
            destType: destType,
            destinationId: destUUID,
            onModel: modelType
          }
          const filter = { mediaUuid: doc.mediaUuid, destinationId }
          const rs = await media
            .findOneAndUpdate(
              filter,
              doc,
              { upsert: false, new: true, overwrite: false })
            .lean()

          if (rs == null) return null
          // @ts-expect-error-error
          rs.destinationId = area // mimic Mongoose popuplate()'
          return rs
        }
        default: return null
      }
    } catch (e) {
      if (e.code === 11000) {
        throw new UserInputError('Duplicated mediaUuid and destinationId')
      }
      throw e
    }
  }
}
