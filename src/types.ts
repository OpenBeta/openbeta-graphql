
export enum SortDirection {
  ASC = 1,
  DESC = -1
}

type Sortable = 'area_name'

export type Sort = Map<Sortable, SortDirection>

type Filterable = 'area_name' | 'leaf_status' | 'path_tokens'

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
}

type FilterParams = AreaFilterParams | LeafStatusParams | PathTokenParams
export type GQLFilter = Record<Filterable, FilterParams>
