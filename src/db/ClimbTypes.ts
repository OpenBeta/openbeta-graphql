import { MUUID } from 'uuid-mongodb'
import { Point } from '@turf/helpers'
// import type { WithId, Document } from 'mongodb'
import { ChangeRecordMetadataType } from './ChangeLogType'
import { GradeContexts } from '../grade-utils'
import { GradeScalesTypes } from '@openbeta/sandbag'

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
  yds: string
  grades: Partial<Record<GradeScalesTypes, string>>
  gradeContext?: GradeContexts
  type: IClimbType
  safety: SafetyType
  _change?: ChangeRecordMetadataType
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

export interface IClimbType {
  trad: boolean
  sport: boolean
  boulder: boolean
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
