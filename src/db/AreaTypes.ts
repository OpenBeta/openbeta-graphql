import { ObjectId } from 'mongoose'
import { IClimb } from './ClimbTypes'
export type AreaType = IAreaProps & {
  metadata: IAreaMetadata
}

export interface IAreaProps {
  area_name: string
  climbs?: IClimb[]
  children?: [ObjectId]
  content: IAreaContent
  parentHashRef: string
  pathHash: string
}

export interface IAreaMetadata {
  lat: number|null
  lng: number|null
  left_right_index: number
  mp_id?: string
  area_id: string
}
export interface IAreaContent {
  description?: string
}
