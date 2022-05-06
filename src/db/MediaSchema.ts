import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import { MediaType, RefModelType } from './MediaTypes.js'

const { Schema, connection } = mongoose

const MediaSchema = new Schema<MediaType>({
  mediaUuid: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4(),
    required: true,
    unique: false,
    index: true
  },
  mediaUrl: { type: String, required: true },
  mediaType: { type: Number, required: true },
  destType: { type: Number, required: true },
  destinationId: {
    type: Schema.Types.Mixed,
    value: { type: 'Buffer' },
    required: true,
    refPath: 'onModel'
  },
  onModel: {
    type: String,
    required: true,
    enum: Object.values(RefModelType)
  }
}, {
  toObject: {
    virtuals: true
  },
  toJSON: { virtuals: true },
  _id: false
})

MediaSchema.index({ mediaUuid: 1, srcUuid: 1 }, { unique: true })

export const getMediaModel = (name: string = 'media'): mongoose.Model<typeof MediaSchema> => {
  return connection.model(name, MediaSchema)
}
