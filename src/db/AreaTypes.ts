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
  content: IAreaContent
  parentHashRef: string
  pathHash: string
  pathTokens: string[]
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
