import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { AreaType } from './AreaTypes.js'
import { ClimbType } from './ClimbTypes.js'

export interface MediaType {
  _id?: mongoose.Types.ObjectId
  mediaUuid: MUUID
  mediaUrl: string
  mediaType: number // 0: image, 1: video
  destinationId: MUUID // reference to a climb or area
  destType: number // 0: climb, 1: area
  onModel: RefModelType
}

export enum RefModelType {
  climbs = 'climbs',
  areas = 'areas'
}

export interface MediaListByAuthorType {
  _id: string
  tagList: MediaType[]
}

export interface MediaInputType {
  mediaUuid: MUUID
  mediaUrl: string
  mediaType: number
  destinationId: MUUID
  destType: number
}

export interface AreaTagType {
  mediaUuid: MUUID
  mediaUrl: string
  mediaType: number
  area: AreaType
  destType: number
  onModel: RefModelType
}

export interface ClimbTagType {
  mediaUuid: MUUID
  mediaUrl: string
  mediaType: number
  climb: ClimbType
  destType: number
  onModel: RefModelType
}

export type TagEntryResultType = AreaTagType | ClimbTagType

export interface DeleteTagResult {
  mediaUuid: MUUID
  destinationId: MUUID
  removed: boolean
}
