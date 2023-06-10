import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { AreaType } from './AreaTypes.js'
import { ClimbType } from './ClimbTypes.js'
import { MediaObject } from './MediaObjectTypes.js'

/**
 * @deprecated to be removed in favor of MediaObject type
 */
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
export type BaseTagType = MediaType & MediaObject

export interface CompleteAreaTag extends BaseTagType {
  area: AreaType
}

export interface CompleteClimbTag extends BaseTagType {
  climb: ClimbType
}

export type TagType = CompleteAreaTag | CompleteClimbTag

export interface AddEntityTagGQLInput {
  mediaId: string
  entityId: string
  entityType: number
}

export type AddEntityInput = Pick<AddEntityTagGQLInput, 'entityType'> & {
  mediaId: mongoose.Types.ObjectId
  entityUuid: MUUID
}
