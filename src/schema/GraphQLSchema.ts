import { makeExecutableSchema } from '@graphql-tools/schema'

import { typeDef as Climb } from './ClimbTypeDef.js'
import { typeDef as Area } from './AreaTypeDef.js'
import { GQLFilter, Sort } from '../types'
import { md5 } from '../db/import/utils.js'

const resolvers = {
  Query: {
    climb: async (_, { id, uuid }: { id: string, uuid: string }, { dataSources }) => {
      if (id !== '' && id !== undefined) return dataSources.climbs.findOneById(id)
      if (uuid !== '' && uuid !== undefined) {
        return dataSources.climbs.findOneByClimbUUID(uuid)
      }
    },
    climbs: async (_, __, { dataSources }) => {
      return dataSources.climbs.collection.find({}).toArray()
    },
    areas: async (
      _,
      { filter, sort }: { filter?: GQLFilter, sort?: Sort},
      { dataSources: { areas } }
    ) => {
      const filtered = await areas.findAreasByFilter(filter)
      return filtered.collation({ locale: 'en' }).sort(sort).toArray()
    },

    area: async (_: any,
      { id, uuid }: { id: string, uuid: string },
      { dataSources: { areas } }) => {
      if (id !== '' && id !== undefined) return areas.findOneById(id)
      if (uuid !== '' && uuid !== undefined) {
        return areas.findOneByAreaUUID(uuid)
      }
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
    ancestors: async (parent, _, { dataSources: { areas } }) => {
      const ancestors: string[] = []
      const tokens = parent.pathTokens
      for (let i = 0; i < tokens.length; i++) {
        const pathHash = md5(tokens.slice(0, i).join('/'))
        ancestors.push(pathHash)
      }
      const areaAncestors = await areas.findManyByPathHash(ancestors)
      return areaAncestors.map(area => area.metadata.area_id)
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
