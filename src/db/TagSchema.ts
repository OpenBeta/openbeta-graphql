import mongoose from 'mongoose'
import mongooseLeanVirtuals from 'mongoose-lean-virtuals'
import muuid from 'uuid-mongodb'

import { TagType, RefModelType } from './TagTypes.js'

const { Schema } = mongoose

const TagSchema = new Schema<TagType>({
  mediaUrl: {
    type: Schema.Types.String,
    required: true
  },
  mediaUuid: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4(),
    required: true,
    unique: false,
    index: true
  },
  destinationId: {
    type: Schema.Types.Mixed,
    value: { type: 'Buffer' },
    required: true,
    refPath: 'onModel'
  },
  destinationType: {
    type: Number,
    required: true
  },
  onModel: {
    type: String,
    required: true,
    enum: Object.values(RefModelType)
  }
}, {
  _id: true,
  strictQuery: 'throw',
  toObject: {
    virtuals: true
  },
  toJSON: { virtuals: true }
})

TagSchema.virtual('climb', {
  ref: 'climbs',
  localField: 'destinationId',
  foreignField: '_id',
  justOne: true
})

TagSchema.virtual('area', {
  ref: 'areas',
  localField: 'destinationId',
  foreignField: 'metadata.area_id',
  justOne: true
})

TagSchema.plugin(mongooseLeanVirtuals)
TagSchema.index({ mediaUuid: 1, destinationId: 1 }, { unique: true })

export const getTagModel = (name: string = 'tags'): mongoose.Model<TagType> => {
  return mongoose.model(name, TagSchema)
}
