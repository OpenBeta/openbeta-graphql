import { makeExecutableSchema } from '@graphql-tools/schema'

import { typeDef as Climb } from './ClimbTypeDef.js'
import { typeDef as Area } from './AreaTypeDef.js'
import { GQLFilter, Sort } from '../types'

const resolvers = {
  Query: {
    climb: async (_, { ID }, { dataSources }) => {
      return dataSources.climbs.findOneById(ID)
    },
    // climbs: async (_, __, { dataSources: { climbs } }) => {
    //   return climbs.all()
    // },
    areas: async (
      _,
      { filter, sort }: { filter?: GQLFilter, sort?: Sort},
      { dataSources: { areas } }
    ) => {
      const filtered = await areas.findAreasByFilter(filter)
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
