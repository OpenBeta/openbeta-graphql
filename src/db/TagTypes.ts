import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

export interface TagType {
  _id?: mongoose.Types.ObjectId
  mediaUrl: string
  mediaUuid: MUUID
  destinationId: MUUID
  destinationType: number
  onModel: RefModelType
}

export enum RefModelType {
  climbs = 'climbs',
  areas = 'areas'
}

export interface RemoveTagInputType {
  tagId: mongoose.Types.ObjectId
}

export interface GetTagsInputType {
  tagIds: mongoose.Types.ObjectId[]
}
