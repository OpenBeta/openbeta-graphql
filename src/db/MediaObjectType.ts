import { ObjectId } from 'mongoose'
import { MUUID } from 'uuid-mongodb'

export type ImageFormatType = 'jpeg' | 'png' | 'webp' | 'avif'
export interface MediaObjectType {
  _id: ObjectId
  userUuid: MUUID
  mediaUrl: string
  width: number
  height: number
  format: ImageFormatType
  createdAt: Date
  size: number
  tags: RawTag[]
}

export interface RawTag {
  _id: ObjectId
  targetId: MUUID
  type: number
}
