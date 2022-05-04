import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import { MediaType } from './MediaTypes'
import { PointSchema } from './ClimbSchema.js'

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
  srcType: { type: Number, required: true },
  srcUuid: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4(),
    required: true,
    unique: true,
    index: true
  },
  lnglat: {
    type: PointSchema,
    index: '2dsphere'
  }
}, {
  toObject: {
    virtuals: true
  },
  toJSON: { virtuals: true },
  _id: false
})

MediaSchema.virtual('climb', {
  ref: 'areas',
  localField: 'srcUuid',
  foreignField: 'climbs.metadata.climb_id',
  justOne: true
})

MediaSchema.index({ mediaUuid: 1, srcUuid: 1 }, { unique: true })

export const getMediaModel = (name: string = 'media'): mongoose.Model<typeof MediaSchema> => {
  return connection.model(name, MediaSchema)
}
