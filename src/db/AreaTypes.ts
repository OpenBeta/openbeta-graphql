import mongose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { BBox, Point } from '@turf/helpers'
import { ClimbType } from './ClimbTypes'
import { ChangeRecordMetadataType } from './ChangeLogType'

export type AreaType = IAreaProps & {
  metadata: IAreaMetadata
}

export interface IAreaProps {
  _id: mongose.Types.ObjectId
  shortCode?: string
  area_name: string
  climbs: Array<MUUID | ClimbType>
  children: mongose.Types.ObjectId[]
  ancestors: string
  pathTokens: string[]
  aggregate?: AggregateType
  content: IAreaContent
  density: number
  totalClimbs: number
  _change?: ChangeRecordMetadataType
  _deleting?: Date
}

export interface IAreaMetadata {
  isDestination: boolean
  leaf: boolean
  lnglat: Point
  bbox: BBox
  left_right_index: number
  ext_id?: string
  area_id: MUUID
}
export interface IAreaContent {
  description?: string
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
  boulder?: DisciplineStatsType
  alpine?: DisciplineStatsType
  mixed?: DisciplineStatsType
  aid?: DisciplineStatsType
  tr?: DisciplineStatsType
}

export interface DisciplineStatsType {
  total: number
  bands: CountByGradeBandType
}

export interface CountByGradeBandType {
  beginner: number
  intermediate: number
  advance: number
  expert: number
}

export enum OperationType {
  addCountry = 'addCountry',
  addArea = 'addArea',
  deleteArea = 'deleteArea',
  updateDestination = 'updateDestination'
}
