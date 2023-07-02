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

export interface UserMediaGQLQueryInput {
  userUuid: string
  maxFiles?: number
  first?: number
  after?: string
}

export type UserMediaQueryInput = Omit<UserMediaGQLQueryInput, 'userUuid'> & {
  userUuid: MUUID
}

/**
 * GQL user input type for remove tag mutation
 */
export interface EntityTagDeleteGQLInput {
  mediaId: string
  tagId: string
}

/**
 * Formal input type for remove tag function
 */
export interface EntityTagDeleteInput {
  mediaId: mongoose.Types.ObjectId
  tagId: mongoose.Types.ObjectId
}

/**
 * GQL user input type for add media mutation
 */
export type MediaObjectGQLInput = Pick<MediaObject, 'mediaUrl' | 'width' | 'height' | 'format' | 'size'> & {
  userUuid: string
}

/**
 * GQL user input for addEntityTag mutation
 */
export interface AddEntityTagGQLInput {
  mediaId: string
  entityId: string
  entityType: number
}

/**
 * Formal input type for addEntityTag function
 */
export type AddTagEntityInput = Pick<AddEntityTagGQLInput, 'entityType'> & {
  mediaId: mongoose.Types.ObjectId
  entityUuid: MUUID
}

export interface UserMedia {
  userUuid: string
  mediaConnection: {
    edges: MediaEdge[]
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
  }
}

interface MediaEdge {
  node: MediaObject
  cursor: string
}
