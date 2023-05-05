import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { AreaType } from './AreaTypes.js'
import { ClimbType } from './ClimbTypes.js'
import { MediaObjectType } from './MediaObjectType.js'

// Type for 'Media' collection schema
// This is a misnomer.  Should have been called Tag.
// TODO: Rename to TagType
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
export type BaseTagType = MediaType & MediaObjectType

export interface CompleteAreaTag extends BaseTagType {
  area: AreaType
}

export interface CompleteClimbTag extends BaseTagType {
  climb: ClimbType
}

export type TagType = CompleteAreaTag | CompleteClimbTag

export interface MediaByUsers {
  username: string
  userUuid: MUUID
  mediaWithTags: MediaWithTags[]
}

export interface SimpleTag {
  targetId: MUUID
  name: string
  type: number
}
export interface MediaWithTags extends MediaObjectType {
  climbTags: SimpleTag[]
  areaTags: SimpleTag[]
}

export interface MediaInputType {
  mediaUuid: MUUID
  mediaUrl: string
  mediaType: number
  destinationId: MUUID
  destType: number
}

/**
 * TODO: consolidate this type with BaseTagType
 */
interface LegacyBaseTagType {
  _id: mongoose.Types.ObjectId
  mediaUuid: MUUID
  mediaUrl: string
  mediaType: number
  destType: number
  onModel: RefModelType
}

export interface AreaTagType extends LegacyBaseTagType {
  area: AreaType
}

export interface ClimbTagType extends LegacyBaseTagType {
  climb: ClimbType
}

export type TagEntryResultType = AreaTagType | ClimbTagType

export interface DeleteTagResult {
  id: string
  mediaUuid: string
  destType: number
  destinationId: string
}

export interface TagByUser {
  username?: string
  userUuid: MUUID
  total: number
}

export interface AllTimeTagStats {
  totalMediaWithTags: number
  byUsers: TagByUser[]
}
export interface TagsLeaderboardType {
  allTime: AllTimeTagStats
}
