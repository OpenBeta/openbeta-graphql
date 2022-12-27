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

// For mongo schema
export type ClimbType = IClimbProps & {
  metadata: IClimbMetadata
  content: IClimbContent
}

export interface IClimbProps {
  _id: MUUID
  name: string
  fa?: string
  yds?: string
  grades?: Partial<Record<GradeScalesTypes, string>>
  gradeContext?: GradeContexts
  type: DisciplineType
  safety?: SafetyType
  _change?: ChangeRecordMetadataType
  /** Used to delete a climb.  See https://www.mongodb.com/docs/manual/core/index-ttl/ */
  _deleting?: Date
  createdAt?: Date
  updatedAt?: Date
  updatedBy?: MUUID
  createdBy?: MUUID
}

export enum SafetyType {
  UNSPECIFIED = 'UNSPECIFIED',
  PG = 'PG',
  PG13 = 'PG13',
  R = 'R',
  X = 'X',
}

export interface IGradeType {
  yds?: string
  french?: string
  font?: string
}

export interface DisciplineType {
  trad: boolean
  sport: boolean
  bouldering: boolean
  alpine: boolean
  snow: boolean
  ice: boolean
  mixed: boolean
  aid: boolean
  tr: boolean
}
export interface IClimbMetadata {
  lnglat: Point
  left_right_index?: number
  mp_id?: string
  mp_crag_id?: string
  areaRef: MUUID
}

export interface IClimbContent {
  description?: string
  protection?: string
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
