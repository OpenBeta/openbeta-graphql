import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections'

export interface ClimbTypeSenseItem {
  climbUUID: string
  climbName: string
  climbDesc: string
  fa: string
  areaNames: string[]
  disciplines: string[]
  grade?: string // Todo: switch to grade context
  safety: string
  cragLatLng?: [number, number]
}

/**
 * Typesense schema for climbs, includes most data that someone might search with,
 * as well as some metadata to help trim the set based on context
 */
export const climbSchema: CollectionCreateSchema = {
  name: 'climbs',
  fields: [
    {
      name: 'climbName',
      type: 'string' as const,
      facet: false
    },
    {
      name: 'climbDesc',
      type: 'string' as const,
      facet: false
    },
    {
      name: 'fa',
      type: 'string' as const,
      facet: false
    },
    {
      name: 'disciplines',
      type: 'string[]' as const,
      facet: true
    },
    {
      name: 'areaNames',
      type: 'string[]' as const,
      facet: false
    },
    {
      name: 'climbUUID',
      type: 'string' as const,
      index: false,
      optional: true
    },
    {
      name: 'grade',
      type: 'string' as const,
      index: false,
      optional: true
    },
    {
      name: 'safety',
      type: 'string' as const,
      index: false,
      optional: true
    },
    {
      name: 'cragLatLng',
      type: 'geopoint' as const,
      index: true
    }
  ],
  token_separators: ['(', ')', '-', '.']
  // TBD: need to have better tie-breakers (star/popularity ratings)
  // default_sorting_field: 'climb_name'
}

export interface AreaTypeSenseItem {
  id: string
  name: string
  pathTokens: string[]
  areaUUID: string
  areaLatLng?: [number, number]
  leaf: boolean
  isDestination: boolean
  totalClimbs: number
  density: number
}

/**
 * Typesense schema for areas. Areas are slightly easier to
 */
export const areaSchema: CollectionCreateSchema = {
  name: 'areas',
  fields: [
    {
      name: 'name',
      type: 'string' as const,
      facet: false
    },
    {
      // Ancestor area names of this area
      name: 'pathTokens',
      type: 'string[]' as const,
      facet: false
    },
    {
      name: 'areaUUID',
      type: 'string' as const,
      index: false,
      optional: true
    },
    {
      name: 'totalClimbs',
      type: 'int32' as const,
      facet: false
    },
    {
      name: 'density',
      type: 'float' as const,
      facet: false
    },
    {
      name: 'isDestination',
      type: 'bool' as const,
      index: true
    },
    {
      name: 'leaf',
      type: 'bool' as const,
      index: true
    },
    {
      name: 'areaLatLng',
      type: 'geopoint' as const,
      index: true
    }
  ],
  token_separators: ['(', ')', '-', '.']
}
