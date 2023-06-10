import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'
import { Point } from '@turf/helpers'

export type ImageFormatType = 'jpeg' | 'png' | 'webp' | 'avif'

export interface MediaObject {
  _id: mongoose.Types.ObjectId
  userUuid: MUUID
  mediaUrl: string
  width: number
  height: number
  format: ImageFormatType
  createdAt: Date
  size: number
  entityTags: EntityTag[]
}

export interface EntityTag {
  _id: mongoose.Types.ObjectId
  targetId: MUUID
  type: number
  ancestors: string
  climbName?: string
  areaName: string
  lnglat: Point
}

export interface MediaByUsers {
  username: string
  userUuid: MUUID
  mediaWithTags: MediaObject[]
}
export interface MediaForFeedInput {
  uuidStr?: string
  maxUsers?: number
  maxFiles?: number
  includesNoEntityTags?: boolean
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

export interface UserMediaQueryInput {
  userUuid: string
  maxFiles?: number
}

export interface EntityTagDeleteGQLInput {
  mediaId: string
  tagId: string
}

export type MediaObjectGQLInput = Pick<MediaObject, 'mediaUrl' | 'width' | 'height' | 'format' | 'size'> & {
  userUuid: string
}
