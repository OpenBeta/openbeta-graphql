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
  entityTags?: EntityTag[]
  expiresAt?: Date
}

export interface EntityTag {
  _id: mongoose.Types.ObjectId
  targetId: MUUID
  type: number
  ancestors: string
  climbName?: string
  areaName: string
  lnglat?: Point
  topoData?: object
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

/**
 * For creating a new Media object doc
 */
export type NewMediaObjectDoc = Omit<MediaObject, '_id' | 'createdAt'>

/**
 * GQL input type for getting paginated media for an "Entity", which is either a user, an area, or a climb.
 * The userUuid is omitted from the Area and Climb versions of this type, which are defined below
 * as AreaMediaQueryInput and ClimbMediaQueryInput
 * @param maxFiles - the maximum number of media files to return
 * @param first - the number of media files to return
 * @param after - the cursor to start from
 */
export interface EntityMediaGQLQueryInput {
  maxFiles?: number
  first?: number
  after?: string
}

export type UserMediaQueryInput = EntityMediaGQLQueryInput & {
  userUuid: MUUID
}

export type AreaMediaQueryInput = EntityMediaGQLQueryInput & {
  areaUuid: MUUID
}

export type ClimbMediaQueryInput = EntityMediaGQLQueryInput & {
  climbUuid: MUUID
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
export type MediaObjectGQLInput = Pick<MediaObject, 'width' | 'height' | 'format' | 'size'> & {
  userUuid: string
  mediaUrl?: string
  entityTag?: Omit<AddEntityTagGQLInput, 'mediaId'>
  filename?: string
  maskFilename?: boolean
}

/**
 * GQL user input for addEntityTag mutation
 */
export interface AddEntityTagGQLInput {
  mediaId: string
  entityId: string
  entityType: number
  topoData?: object
}

/**
 * Formal input type for addEntityTag function
 */
export type AddTagEntityInput = Pick<AddEntityTagGQLInput, 'entityType' | 'topoData'> & {
  mediaId: mongoose.Types.ObjectId
  entityUuid: MUUID
}

export interface UserMedia {
  userUuid: string
  mediaConnection: {
    edges: MediaEdge[]
    pageInfo: {
      hasNextPage: boolean
      totalItems: number
      endCursor: string | null
    }
  }
}

export type AreaMedia = Omit<UserMedia, 'userUuid'> & {
  areaUuid: string
}

export type ClimbMedia = Omit<UserMedia, 'userUuid'> & {
  climbUuid: string
}

interface MediaEdge {
  node: MediaObject
  cursor: string
}

export interface DeleteMediaGQLInput {
  mediaId: string
}
