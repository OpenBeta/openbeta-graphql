import { makeExecutableSchema } from '@graphql-tools/schema'

import { typeDef as Climb } from './ClimbTypeDef.js'
import { typeDef as Area } from './AreaTypeDef.js'

export enum SortDirection {
  ASC = 1,
  DESC = -1
}

type Sortable = 'area_name'
export type Sort = Map<Sortable, SortDirection>

type Filterable = 'area_name' | 'climb_count'

interface AreaFilterParams {
  match: string
  exactMatch: boolean | undefined
}

interface ClimbCountParams {
  compare: 'lt' | 'gt'
  count: number
}
type FilterParams = AreaFilterParams | ClimbCountParams
export type Filter = Record<Filterable, FilterParams>

const resolvers = {
  Query: {
    climb: async (parent, { ID }, { dataSources }) => {
      return dataSources.climbs.findOneById(ID)
    },
    // climbs: async (_, __, { dataSources: { climbs } }) => {
    //   return climbs.all()
    // },
    areas: async (
      _,
      { isLeaf, filter, sort }: { isLeaf: boolean, filter?: Filter, sort?: Sort},
      { dataSources: { areas } }
    ) => {
      if (isLeaf) return areas.findAreasWithClimbs()

      let filtered = await areas.all()
      if (filter?.area_name !== null) {
        const fAreaName = Object.assign(
          { exactMatch: false },
          filter?.area_name as AreaFilterParams
        )
        filtered = fAreaName.match !== ''
          ? await areas.findByName(fAreaName.match, !fAreaName.exactMatch)
          : filtered
      }

      return filtered.collation({ locale: 'en' }).sort(sort).toArray()
    },

    area: async (_, { id }: { id: string }, { dataSources: { areas } }) => {
      if (id !== undefined && id !== '') return areas.findOneById(id)
      return null
    }
  },

  Climb: {
    // TODO: let's see if we need to create any field resolvers
  },

  Area: {
    children: async (parent, _, { dataSources: { areas } }) => {
      if (parent.children.length > 0) {
        return areas.findManyByIds(parent.children)
      }
      return []
    },
    id: async (parent, _, __) => {
      return parent._id.toString()
    }
  }
}

export const schema = makeExecutableSchema({
  typeDefs: [Climb, Area],
  resolvers
})
