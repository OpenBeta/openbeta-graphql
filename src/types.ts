import { BBox } from '@turf/helpers'
import { AreaType } from './db/AreaTypes'

export enum SortDirection {
  ASC = 1,
  DESC = -1
}

export type Sortable = 'area_name'

export type Sort = Record<Sortable, SortDirection>

type Filterable = 'area_name' | 'leaf_status' | 'path_tokens' | 'field_compare'

export interface ComparisonFilterParams {
  field: 'totalClimbs' | 'density'
  num: number
  comparison: 'lt' | 'gt' | 'eq'
}

export interface AreaFilterParams {
  match: string
  exactMatch: boolean | undefined
}

export interface LeafStatusParams {
  isLeaf: boolean
}

export interface PathTokenParams {
  tokens: string[]
  exactMatch: boolean | undefined
  size: number
}

type FilterParams = AreaFilterParams | LeafStatusParams | PathTokenParams | ComparisonFilterParams[]
export type GQLFilter = Record<Filterable, FilterParams>

export type LNGLAT = [number, number]
export type BBoxType = BBox
export interface StatisticsType {
  totalClimbs: number
  totalCrags: number
}

export interface CragsNear {
  _id: string
  count: number
  crags: AreaType
}

export interface QueryByIdType {
  id?: string
  uuid?: string
}

export interface AuthUserType {
  roles: string[]
}
