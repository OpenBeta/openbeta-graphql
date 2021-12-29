import { makeExecutableSchema } from '@graphql-tools/schema'

import { typeDef as Climb } from './ClimbTypeDef.js'
import { typeDef as Area } from './AreaTypeDef.js'

const resolvers = {
  Query: {
    climb: async (parent, { ID }, { dataSources }) => {
      return dataSources.climbs.findOneById(ID)
    },

    areas: async (
      _,
      { name, nameContains, isLeaf }: { name: string, nameContains: string, isLeaf: boolean },
      { dataSources: { areas } }
    ) => {
      if (isLeaf) return areas.findAreasWithClimbs()
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
