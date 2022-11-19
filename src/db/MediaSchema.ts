import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import mongooseLeanVirtuals from 'mongoose-lean-virtuals'

import { MediaType, RefModelType } from './MediaTypes.js'

const { Schema } = mongoose

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

MediaSchema.virtual('climb', {
  ref: 'climbs',
  localField: 'destinationId',
  foreignField: '_id',
  justOne: true
})

MediaSchema.virtual('area', {
  ref: 'areas',
  localField: 'destinationId',
  foreignField: 'metadata.area_id',
  justOne: true
})

MediaSchema.plugin(mongooseLeanVirtuals)
MediaSchema.index({ mediaUuid: 1, destinationId: 1 }, { unique: true })

export const getMediaModel = (name: string = 'media'): mongoose.Model<MediaType> => {
  return mongoose.model(name, MediaSchema)
}
