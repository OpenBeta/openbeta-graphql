import mongoose from 'mongoose'
import mongooseLeanVirtuals from 'mongoose-lean-virtuals'
import muuid from 'uuid-mongodb'

import { XMediaType } from './XMediaTypes.js'

const { Schema } = mongoose

const XMediaSchema = new Schema<XMediaType>({
  userId: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4(),
    required: true,
    unique: false,
    index: true
  },
  mediaType: {
    type: Schema.Types.Number,
    required: true
  },
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
  tagIds: {
    type: [Schema.Types.ObjectId],
    required: true
  }
}, {
  _id: true,
  strictQuery: 'throw',
  toObject: {
    virtuals: true
  },
  toJSON: { virtuals: true }
})

XMediaSchema.plugin(mongooseLeanVirtuals)

export const getXMediaModel = (name: string = 'xmedia'): mongoose.Model<XMediaType> => {
  return mongoose.model(name, XMediaSchema)
}
