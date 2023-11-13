import mongoose from 'mongoose'
import mongooseLeanVirtuals from 'mongoose-lean-virtuals'
import muuid from 'uuid-mongodb'
import { PostType } from './PostTypes'
import { XMediaSchema } from './XMediaSchema'

const { Schema } = mongoose

const PostSchema = new Schema<PostType>({
  userId: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4(),
    required: true,
    unique: false,
    index: true
  },
  xMedia: {
    type: [XMediaSchema],
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
