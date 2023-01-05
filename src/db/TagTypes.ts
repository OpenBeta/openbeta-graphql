import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

export interface TagType {
  _id?: mongoose.Types.ObjectId
  mediaUrl: string
  mediaUuid: MUUID
  destinationId: mongoose.Types.ObjectId
  destinationType: number
  // onModel: RefModelType
}

export interface RemoveTagInputType {
  tagId: mongoose.Types.ObjectId
}

export interface GetTagsInputType {
  tagIds: mongoose.Types.ObjectId[]
}
