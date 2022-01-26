import { makeExecutableSchema } from '@graphql-tools/schema'

import { typeDef as Climb } from './ClimbTypeDef.js'
import { typeDef as Area } from './AreaTypeDef.js'
import { GQLFilter, Sort } from '../types'
import { AreaType, CountByGroupType } from '../db/AreaTypes.js'

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
      { filter, sort }: { filter?: GQLFilter, sort?: Sort },
      { dataSources: { areas } }
    ) => {
      const filtered = await areas.findAreasByFilter(filter)
      return filtered.collation({ locale: 'en' }).sort(sort).toArray()
    },
    area: async (_: any,
      { id, uuid }: { id: string, uuid: string },
      { dataSources }) => {
      const { areas } = dataSources
      if (id !== '' && id !== undefined) return dataSources.areas.findOneById(id)
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
    id: async (parent, _, { dataSources: { areas } }) => parent._id,

    children: async (parent, _, { dataSources: { areas } }) => {
      if (parent.children.length > 0) {
        return areas.findManyByIds(parent.children)
      }
      return []
    },

    aggregate: async (parent, _, { dataSources: { areas } }) => {
      // get all leafs under this parent
      const allChildAreas: AreaType[] = await areas.findDescendantsByPath(parent.ancestors, true)
      const byGrade = {}
      const byType = {}

      allChildAreas.forEach(area => {
        // exit early if there are no climbs
        if (area.climbs === undefined) {
          return
        }

        area.climbs.forEach((climb) => {
          const { yds, type } = climb
          // Grade
          const entry: CountByGroupType = byGrade[yds] === undefined ? { label: yds, count: 0 } : byGrade[yds]
          entry.count = entry.count + 1
          byGrade[yds] = entry

          for (const t in type) {
            if (type[t] !== false) {
              const entry: CountByGroupType = byType[t] !== undefined ? byType[t] : { label: t, count: 0 }
              byType[t] = Object.assign(entry, { count: entry.count + 1 })
            }
          }
        })
      })

      return {
        byGrade: Object.values(byGrade),
        byType: Object.values(byType)
      }
    },

    ancestors: async (parent, _, { dataSources: { areas } }) => parent.ancestors.split(',')
  }
}

export const schema = makeExecutableSchema({
  typeDefs: [Climb, Area],
  resolvers
})
