import mongoose from 'mongoose'
import mongooseLeanVirtuals from 'mongoose-lean-virtuals'

import { PostType } from './PostTypes.js'

const { Schema } = mongoose

const PostSchema = new Schema<PostType>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  mediaIds: {
    type: [Schema.Types.ObjectId],
    required: true
  },
  description: { type: String }
}, {
  _id: true,
  strictQuery: 'throw',
  toObject: {
    virtuals: true
  },
  toJSON: { virtuals: true }
})

PostSchema.plugin(mongooseLeanVirtuals)

export const getPostModel = (name: string = 'post'): mongoose.Model<PostType> => {
  return mongoose.model(name, PostSchema)
}
