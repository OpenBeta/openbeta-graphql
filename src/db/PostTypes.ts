import mongoose from 'mongoose'
export interface PostType {
  userId: mongoose.Types.ObjectId
  mediaIds: mongoose.Types.ObjectId[]
  description?: string
}

export interface AddPostInputType {
  userId: mongoose.Types.ObjectId
  mediaIds: mongoose.Types.ObjectId[]
  description?: string
}

export interface RemovePostInputType {
  postId: mongoose.Types.ObjectId
}
