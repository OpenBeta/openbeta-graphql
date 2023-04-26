import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { AreaType } from './AreaTypes.js'
import { ClimbType } from './ClimbTypes.js'
import { MediaMetaType } from './MediaMetaType.js'

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

/**
 * A tag with media metadata
 */
export type TagWithMediaMetaType = MediaType & MediaMetaType

export interface CompleteAreaTag extends TagWithMediaMetaType {
  area: AreaType
}

export interface CompleteClimbTag extends TagWithMediaMetaType {
  climb: ClimbType
}

export type TagType = CompleteAreaTag | CompleteClimbTag

export interface MediaListByAuthorType {
  _id: string
  tagList: TagType[]
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

export interface TagsLeaderboardType {
  userUuid: string
  total: number
}
