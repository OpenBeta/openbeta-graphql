import { MUUID } from 'uuid-mongodb'
import { Point } from '@turf/helpers'
import { GradeScalesTypes } from '@openbeta/sandbag'

import { ChangeRecordMetadataType } from './ChangeLogType'
import { GradeContexts } from '../GradeUtils.js'

// For search climb by id queries
// Additional fields allow client to build breadcrumbs
export type ClimbExtType = ClimbType & {
  ancestors: string
  pathTokens: string[]
}

/**
 * Climbs may be considered THE most important data type in the OpenBeta data model.
 * Clinbs have a number of fields that may be expected to appear within their documents.
 */
export type ClimbType = IClimbProps & {
  metadata: IClimbMetadata
  content: IClimbContent
}

export interface IClimbProps {
  _id: MUUID
  name: string
  /** First ascent, if known. Who was the first person to climb this route? */
  fa?: string
  yds?: string
  /**
   * Grades appear within as an I18n-safe format.
   * We achieve this via a larger data encapsulation, and perform interpretation and comparison
   * with the [sandbag library](https://github.com/OpenBeta/sandbag)
   */
  grades?: Partial<Record<GradeScalesTypes, string>>
  /**
   * Even with the grade I18n solutions we propose, we assign a grade context to a given
   * climb. This context can be used in the consideration of a grade's true value.
   */
  gradeContext?: GradeContexts
  type: DisciplineType
  safety?: SafetyType

  /**
   * If this climb has been edited, this field will contain the metadata about the
   * last edit that was made to the document.
   */
  _change?: ChangeRecordMetadataType
  /** Used to delete a climb.  See https://www.mongodb.com/docs/manual/core/index-ttl/ */
  _deleting?: Date
  createdAt?: Date
  updatedAt?: Date
  updatedBy?: MUUID
  createdBy?: MUUID
}

/**
 * rating indicates the quality and spacing of a route's available protection for a competent
 * climber. Amusingly, the letter codes associated with the different protection ratings
 * are based on the American system for movie ratings.
 **/
export enum SafetyType {
  UNSPECIFIED = 'UNSPECIFIED',
  /** Generally good protection with a few sections of poor protection */
  PG = 'PG',
  /** Fair protection that may result in long, potentially dangerous falls */
  PG13 = 'PG13',
  /** where there's limited protection and the possibility of serious injury */
  R = 'R',
  /** No protection and overall the route is extremely dangerous. */
  X = 'X',
}

export interface IGradeType {
  yds?: string
  french?: string
  font?: string
}

/**
 * What sort of climb is this? Routes can combine these fields, which is why
 * this is not an enumeration.
 * For example, a route may be a sport route, but also a top rope route.
 */
export interface DisciplineType {
  /** https://en.wikipedia.org/wiki/Traditional_climbing */
  trad?: boolean
  /** https://en.wikipedia.org/wiki/Sport_climbing */
  sport?: boolean
  /** https://en.wikipedia.org/wiki/Bouldering */
  bouldering?: boolean
  /** https://en.wikipedia.org/wiki/Alpine_climbing */
  alpine?: boolean
  /** https://en.wikipedia.org/wiki/Ice_climbing */
  snow?: boolean
  /** https://en.wikipedia.org/wiki/Ice_climbing */
  ice?: boolean
  mixed?: boolean
  /** https://en.wikipedia.org/wiki/Aid_climbing */
  aid?: boolean
  /** https://en.wikipedia.org/wiki/Top_rope_climbing */
  tr?: boolean
}
export interface IClimbMetadata {
  lnglat: Point
  left_right_index?: number
  /** mountainProject ID (if this climb was sourced from mountainproject) */
  mp_id?: string
  /**
   * If this climb was sourced from mountianproject, we expect a parent ID
   * for its crag to also be Available
   */
  mp_crag_id?: string
  /** the parent Area in which this climb appears */
  areaRef: MUUID
}

/** Composable attributes for this climb, these are the bread and butter
 * guidebook-like data that make up the bulk of the text beta for this climb */
export interface IClimbContent {
  /** Beta and general descriptive text for this climb */
  description?: string
  /** What do climbers need to know about making a safe attempt of this climb?
   * What gear do they need, what are the hazards, etc. */
  protection?: string
  /** Information regarding Approach and other location context for this climb.
   * Could also include information about the situation of this specific climb. */
  location?: string
}

export type ClimbGradeContextType = Record<keyof DisciplineType, GradeScalesTypes>

export interface ClimbChangeInputType {
  id?: string
  name?: string
  disciplines?: DisciplineType
  grade?: string
  leftRightIndex?: number
  description?: string
  location?: string
  protection?: string
}

// export type ClimbDBChangeType = ClimbChangeInputType

type UpdatableClimbFieldsType = Pick<ClimbType, 'fa'|'name'|'type' | 'gradeContext' |'grades' | 'content'>
/**
 * Minimum required fields when adding a new climb or boulder problem
 */
export type ClimbChangeDocType =
  Partial<UpdatableClimbFieldsType>
  & { _id: MUUID, metadata: Pick<ClimbType['metadata'], 'areaRef' | 'left_right_index' | 'lnglat'> } & { _change: ChangeRecordMetadataType }

export enum ClimbEditOperationType {
  addClimb = 'addClimb',
  deleteClimb = 'deleteClimb',
  updateClimb = 'updateClimb'
}
