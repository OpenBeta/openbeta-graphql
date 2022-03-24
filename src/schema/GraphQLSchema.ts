import { makeExecutableSchema } from '@graphql-tools/schema'
import { DataSources } from 'apollo-server-core/dist/graphqlOptions'

import { typeDef as Climb } from './ClimbTypeDef.js'
import { typeDef as Area } from './AreaTypeDef.js'
import { GQLFilter, Sort } from '../types'
import { AreaType } from '../db/AreaTypes.js'
import { ClimbType } from '../db/ClimbTypes.js'
import AreaDataSource from '../model/AreaDataSource.js'

const resolvers = {
  Query: {
    climb: async (_, { id, uuid }: { id: string, uuid: string }, { dataSources: { areas } }) => {
      if (id !== '' && id !== undefined) {
        /* eslint-disable-next-line */
        return await areas.findOneClimbById(id)
      }
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
      if (id !== '' && id !== undefined) {
        const area = await areas.findOneById(id)
        return area
      }
      if (uuid !== '' && uuid !== undefined) {
        return areas.findOneByAreaUUID(uuid)
      }
      return null
    },

    stats: async (parent: any, args: any, { dataSources }) => {
      return dataSources.areas.getStats()
    },

    cragsNear: async (
      node: any,
      args,
      { dataSources }: {dataSources: DataSources<AreaDataSource>}) => {
      const { placeId, lnglat, minDistance, maxDistance, includeCrags } = args
      const areas = dataSources.areas as AreaDataSource
      return await areas.getCragsNear(
        placeId,
        [lnglat.lng, lnglat.lat],
        minDistance < 0 ? 0 : minDistance,
        maxDistance > 325000 ? 325000 : maxDistance,
        includeCrags)
    }
  },

  Climb: {
    id: async (node: ClimbType) => node._id,

    // a hack to return 'bouldering' field instead of boulder bc
    // the client is hard-coded to use 'bouldering'
    type: async (node: ClimbType) => {
      if (node.type === undefined) {
        return {
          trad: true
        }
      }
      return {
        ...node.type,
        bouldering: node.type.boulder || null
      }
    },

    // convert internal Geo type to simple lng,lat
    metadata: (node: ClimbType) => ({
      ...node.metadata,
      lng: node.metadata.lnglat.coordinates[0],
      lat: node.metadata.lnglat.coordinates[1]
    })
  },

  Area: {
    id: async (node: AreaType) => node._id,

    children: async (parent: AreaType, _, { dataSources: { areas } }) => {
      if (parent.children.length > 0) {
        return areas.findManyByIds(parent.children)
      }
      return []
    },

    aggregate: async (node: AreaType) => {
      return node.aggregate
    },

    ancestors: async (parent) => parent.ancestors.split(','),

    // convert internal Geo type to simple lng,lat
    metadata: (node: AreaType) => ({
      ...node.metadata,
      lng: node.metadata.lnglat.coordinates[0],
      lat: node.metadata.lnglat.coordinates[1]
    })
  }
}

export const schema = makeExecutableSchema({
  typeDefs: [Climb, Area],
  resolvers
})
