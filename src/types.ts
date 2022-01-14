
export enum SortDirection {
  ASC = 1,
  DESC = -1
}

export type Sortable = 'area_name'

export type Sort = Record<Sortable, SortDirection>

type Filterable = 'area_name' | 'leaf_status' | 'path_tokens'

interface Compare { num: number, comparison: 'lt' | 'gt' | 'eq' }

export interface ComparisonFilterParams {
  field: 'totalClimbs'
  comparisons: Compare[]
}

export interface DensityParams {
  density: number // 0 = low, 1 = moderate, 2 = medium, 3 = high
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

type FilterParams = AreaFilterParams | LeafStatusParams | PathTokenParams | DensityParams
export type GQLFilter = Record<Filterable, FilterParams>
