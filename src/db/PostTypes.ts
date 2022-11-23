import { MUUID } from 'uuid-mongodb'

export interface PostType {
  // _id?: mongoose.Types.ObjectId
  media: PostMedia[]
  description?: string
  // mediaType: number
  createdAt: string
  updatedAt: string
  userId: MUUID
  comments: Comment[]
  destinationIds?: MUUID[]
  // destType: number // 0: climb, 1: area
  // onModel: RefModelType
}

export interface PostInputType {
  media: PostMedia[]
  description?: string
  createdAt: string
  updatedAt: string
  userId: MUUID
}

export interface PostMedia {
  mediaUrl: string
  mediaUuid: MUUID
  destinationIds?: MUUID[]
}

export interface Comment {
  userId: MUUID
  createdAt: string
  updatedAt: string
  content: string
}

// export enum RefModelType {
//   climbs = 'climbs',
//   areas = 'areas'
// }
