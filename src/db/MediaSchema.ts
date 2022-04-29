import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import { MediaType, SourceType } from './MediaTypes'
import { PointSchema } from './ClimbSchema.js'

const { Schema, connection } = mongoose

const SourceSchema = new Schema<SourceType>({
  srcType: { type: Number, required: true },
  srcUuid: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4(),
    required: true,
    unique: true,
    index: true
  }
}, { _id: false })

const MediaSchema = new Schema<MediaType>({
  mediaId: { type: String, required: true, unique: true },
  mediaUrl: { type: String, required: true },
  mediaType: { type: Number, required: true },
  sources: [{ type: SourceSchema, required: false }],
  lnglat: {
    type: PointSchema,
    index: '2dsphere'
  }
}, { _id: true })

export const getMediaModel = (name: string = 'media'): mongoose.Model<typeof MediaSchema> => {
  return connection.model(name, MediaSchema)
}
