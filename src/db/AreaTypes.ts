import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { BBox, Point } from '@turf/helpers'
import { ClimbType } from './ClimbTypes.js'
import { ChangeRecordMetadataType } from './ChangeLogType.js'
import { GradeContexts } from '../GradeUtils.js'

export type AreaType = IAreaProps & {
  metadata: IAreaMetadata
}

export interface IAreaProps {
  _id: mongoose.Types.ObjectId
  /**
   * ShortCodes are short, globally uniqe codes that identify significant climbing areas
   **/
  shortCode?: string
  /**
   * What name is considered most popular for this area?
   * Areas occasionally have multiple valid names, but this one is the one
   * that might be considered as the 'most popular'.
   *
   * It's not a great idea to identify by this field, as area names are not
   * unique and are subject to change.
   **/
  area_name: string
  /**
   * The climbs that appear within this area. (Only applies for leaf nodes)
   */
  climbs: Array<MUUID | ClimbType>
  /**
   * All child area documents that are contained within this area.
   * This has a strong relation to the areas collection, and contains only direct
   * child areas - rather than all descendents.
   */
  children: mongoose.Types.ObjectId[]
  ancestors: string
  pathTokens: string[]
  gradeContext: GradeContexts
  aggregate?: AggregateType
  content: IAreaContent
  density: number
  /** The total number of climbs in this area. */
  totalClimbs: number
  _change?: ChangeRecordMetadataType
  /** Used to delete an area.  See https://www.mongodb.com/docs/manual/core/index-ttl/ */
  _deleting?: Date
  createdAt?: Date
  updatedAt?: Date
  updatedBy?: MUUID
  createdBy?: MUUID
}

export interface IAreaMetadata {
  isDestination: boolean
  leaf: boolean
  isBoulder?: boolean
  lnglat: Point
  bbox: BBox
  left_right_index: number
  ext_id?: string
  area_id: MUUID
}
export interface IAreaContent {
  description?: string
}

export interface AreaEditableFieldsType {
  areaName?: string
  description?: string
  isDestination?: boolean
  shortCode?: string
  lat?: number
  lng?: number
}

export interface CountByGroupType {
  count: number
  label: string
}
export interface AggregateType {
  byGrade: CountByGroupType[]
  byDiscipline: CountByDisciplineType
  byGradeBand: CountByGradeBandType
}
export interface CountByDisciplineType {
  trad?: DisciplineStatsType
  sport?: DisciplineStatsType
  bouldering?: DisciplineStatsType
  alpine?: DisciplineStatsType
  snow?: DisciplineStatsType
  ice?: DisciplineStatsType
  mixed?: DisciplineStatsType
  aid?: DisciplineStatsType
  tr?: DisciplineStatsType
}

export interface DisciplineStatsType {
  total: number
  bands: CountByGradeBandType
}

export interface CountByGradeBandType {
  unknown: number
  beginner: number
  intermediate: number
  advanced: number
  expert: number
}

export enum OperationType {
  addCountry = 'addCountry',
  addArea = 'addArea',
  deleteArea = 'deleteArea',
  updateDestination = 'updateDestination',
  updateArea = 'updateArea'
}
