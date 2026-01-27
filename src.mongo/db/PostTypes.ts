import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'
import { XMediaType } from './XMediaTypes'
export interface PostType {
  userId: MUUID
  xMedia: XMediaType[]
  description?: string
}

export interface AddPostInputType {
  photoUrls: string[]
  userId: string
  description?: string
  mediaType: number
}

export interface RemovePostInputType {
  postId: mongoose.Types.ObjectId
}

export interface GetPostsInputType {
  postIds: mongoose.Types.ObjectId[]
}
