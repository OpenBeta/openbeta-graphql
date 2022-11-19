import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { PostType, Comment, NewMedia } from './PostTypes'

const { Schema } = mongoose

const CommentSchema = new Schema<Comment>({
  userId: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4(),
    required: true,
    unique: false,
    index: true
  },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
  content: { type: String, required: true }
})

const NewMediaSchema = new Schema<NewMedia>({
  mediaUrl: { type: String, required: true },
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
  }
})

const PostSchema = new Schema<PostType>(
  {
    media: [NewMediaSchema],
    description: { type: String, required: true },
    // mediaType: { type: Number, required: true },
    // destType: { type: Number, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    userId: {
      type: 'object',
      value: { type: 'Buffer' },
      default: () => muuid.v4(),
      required: true,
      unique: false,
      index: true
    },
    comments: [CommentSchema]
  },
  {
    toObject: {
      virtuals: true
    },
    toJSON: { virtuals: true }
  }
)

// PostSchema.index({ mediaUuid: 1, destinationId: 1 }, { unique: true })

export const getPostModel = (
  name: string = 'post'
): mongoose.Model<PostType> => {
  return mongoose.model(name, PostSchema)
}
