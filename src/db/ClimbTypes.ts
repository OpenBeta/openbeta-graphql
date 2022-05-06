import { MUUID } from 'uuid-mongodb'
import { Point } from '@turf/helpers'
import type { WithId, Document } from 'mongodb'
import { AreaType } from './AreaTypes'

// For search climb by id queries
// Additional fields allow client to build breadcrumbs
export type ClimbExtType = ClimbType & WithId<Document> & {
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
  type: IClimbType
  safety: SafetyType
}

export enum SafetyType {
  UNSPECIFIED = 'UNSPECIFIED',
  PG = 'PG',
  PG13 = 'PG13',
  R = 'R',
  X = 'X',
}
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
  climb_id: MUUID
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
