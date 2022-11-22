import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { AreaType } from './AreaTypes.js'
import { ClimbType } from './ClimbTypes.js'

// Type for 'Media' collection schema
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

interface BaseTagType {
  _id: mongoose.Types.ObjectId
  mediaUuid: MUUID
  mediaUrl: string
  mediaType: number
  destType: number
  onModel: RefModelType
}
export interface AreaTagType extends BaseTagType {
  area: AreaType
}

export interface ClimbTagType extends BaseTagType {
  climb: ClimbType
}

export type TagEntryResultType = AreaTagType | ClimbTagType

export interface DeleteTagResult {
  id: string
  mediaUuid: string
  destType: number
  destinationId: string
}
