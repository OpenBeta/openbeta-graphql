import { makeExecutableSchema } from '@graphql-tools/schema'

import { typeDef as Climb } from './Climb'
import { typeDef as Area } from './Area'

const resolvers = {
  Query: {
    climb: async (parent, { ID }, { dataSources }) => {
      return dataSources.climbs.findOneById(ID)
    },

    areas: async (
      _,
      { name, nameContains }: { name: string, nameContains: string },
      { dataSources: { areas } }
    ) => {
      if (name !== '') return areas.findByName(name)
      if (nameContains !== '') return areas.findByName(nameContains, true)

      return areas.all()
    },

    area: async (_, { id }: { id: string }, { dataSources: { areas } }) => {
      if (id !== '') return areas.findOneById(id)
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
      return null
    }
  }
}

export const schema = makeExecutableSchema({
  typeDefs: [Climb, Area],
  resolvers
})
