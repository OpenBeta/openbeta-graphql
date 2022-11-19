import { MUUID } from 'uuid-mongodb'

export interface PostType {
  // _id?: mongoose.Types.ObjectId
  media: NewMedia[]
  description: string
  // mediaType: number
  createdAt: string
  updatedAt: string
  userId: MUUID
  comments: Comment[]
  // destType: number // 0: climb, 1: area
  // onModel: RefModelType
}

export interface PostInputType {
  media: NewMedia[]
  description: string
  createdAt: string
  updatedAt: string
  userId: MUUID
}

export interface NewMedia {
  mediaUrl: string
  mediaUuid: MUUID
  destinationId: MUUID
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
