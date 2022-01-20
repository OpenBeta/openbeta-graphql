import { Types } from 'mongoose'

import { ClimbType } from './ClimbTypes'

export type AreaType = IAreaProps & {
  metadata: IAreaMetadata
}

export interface IAreaProps {
  area_name: string
  climbs?: ClimbType[]
  children?: [Types.ObjectId]
  ancestors: string[]
  aggregate: AggregateType
  content: IAreaContent
  parentHashRef: string
  pathHash: string
  pathTokens: string[]
  density: number
  totalClimbs: number
  bounds?: [PointType]
}

export interface IAreaMetadata {
  leaf: boolean|null
  lat: number|null
  lng: number|null
  left_right_index: number
  mp_id?: string
  area_id: string
}
export interface IAreaContent {
  description?: string
}

export interface CountByGroupType {
  count: number
  label: string
}
export interface PointType { lat: number, lng: number}

export interface AggregateType {
  byGrade: [CountByGroupType] | []
  byType: [CountByGroupType] | []
}
