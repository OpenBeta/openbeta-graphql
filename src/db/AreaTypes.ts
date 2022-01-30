import mongose from 'mongoose'
import { ClimbType } from './ClimbTypes'

export type AreaType = IAreaProps & {
  metadata: IAreaMetadata
}

export interface IAreaProps {
  _id: mongose.Types.ObjectId
  area_name: string
  climbs: ClimbType[]
  children: mongose.Types.ObjectId[]
  ancestors: string
  pathTokens: string[]
  aggregate: AggregateType
  content: IAreaContent
  density: number
  totalClimbs: number
  bounds?: [PointType]
}

export interface IAreaMetadata {
  leaf: boolean
  lat: number|null
  lng: number|null
  left_right_index: number
  ext_id?: string
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
