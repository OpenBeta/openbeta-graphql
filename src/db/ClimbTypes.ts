import { MUUID } from 'uuid-mongodb'
import { Point } from '@turf/helpers'
import type { WithId, Document } from 'mongodb'
import { ChangeRecordMetadataType } from './ChangeLogType'

/**
 * For search climb by id queries
 * Additional fields allow client to build breadcrumbs
 */
export type ClimbExtType = ClimbType & WithId<Document> & {
  ancestors: string
  pathTokens: string[]
}

/**
 * Shape of a climb document in the climbs collection
 */
export type ClimbType = IClimbProps & {
  metadata: IClimbMetadata
  content: IClimbContent
}

/**
 * Primary properties we expect to see on a climb document
 * stored in the climbs collection
 */
export interface IClimbProps {
  _id: MUUID
  /** The name of this climb */
  name: string
  /**
   * First ascent data (if available), this is an unstructured field
   * storing user-composed data
   */
  fa?: string
  /**
   * Yosemite decimal grade system https://en.wikipedia.org/wiki/Yosemite_Decimal_System
   */
  yds: string
  type: IClimbType
  safety: SafetyType
  _change?: ChangeRecordMetadataType
}

/** https://en.wikipedia.org/wiki/Yosemite_Decimal_System#Protection_rating */
export enum SafetyType {
  UNSPECIFIED = 'UNSPECIFIED',
  /** Fair protection. Falls may be long but a competent leader can place
   * enough protection to avoid serious risk of injury.  */
  PG = 'PG',
  /** Fair protection. Falls may be long but a competent leader can place
   * enough protection to avoid serious risk of injury.  */
  PG13 = 'PG13',
  /**
   * Run-out climbing. Some protection placements may be far enough
   * apart so that it is not possible to protect against hitting the ground or a ledge.  
   */
  R = 'R',
  /** Protection is unavailable or so sparse that any fall is likely to result in death or serious injury.  */
  X = 'X',
}

/** Climb style / discipline */
export interface IClimbType {
  trad: boolean
  sport: boolean
  boulder: boolean
  alpine: boolean
  mixed: boolean
  aid: boolean
  tr: boolean
}
export interface IClimbMetadata {
  lnglat: Point
  left_right_index: number
  mp_id?: string
  mp_crag_id: string
  areaRef: MUUID
}
export interface IClimbContent {
  description?: string
  protection?: string
  location?: string
}

export enum GradeBand {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCE = 'advance',
  EXPERT = 'expert'
}
