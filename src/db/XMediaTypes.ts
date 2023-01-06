import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

export interface XMediaType {
  _id?: mongoose.Types.ObjectId
  userId: MUUID
  mediaType: number // 0: photo
  mediaUuid: MUUID
  mediaUrl: string
  tagIds: mongoose.Types.ObjectId[]
}

export interface RemoveXMediaInputType {
  xMediaId: mongoose.Types.ObjectId
}

export interface GetXMediaInputType {
  xMediaIds: mongoose.Types.ObjectId[]
}
