import { makeExecutableSchema } from '@graphql-tools/schema'
import { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import muid, { MUUID } from 'uuid-mongodb'

import { CommonResolvers, CommonTypeDef } from './common/index.js'
import { typeDef as Climb } from './ClimbTypeDef.js'
import { typeDef as Area } from './AreaTypeDef.js'
import { typeDef as MediaTypeDef } from './MediaTypeDef.js'
import { typeDef as TickTypeDef } from './TickTypeDef.js'
import { HistoryTypeDef, HistoryQueries, HistoryFieldResolvers } from '../graphql/history/index.js'
import { QueryByIdType, GQLFilter, Sort } from '../types'
import { AreaType } from '../db/AreaTypes.js'
import { ClimbExtType, ClimbType } from '../db/ClimbTypes.js'
import AreaDataSource from '../model/AreaDataSource.js'
import { MediaMutations, MediaQueries, MediaResolvers } from './media/index.js'
import { AreaEditTypeDef, AreaQueries, AreaMutations } from './area/index.js'
import TickMutations from './tick/TickMutations.js'
import TickQueries from './tick/TickQueries.js'

const resolvers = {
  Mutation: {
    ...MediaMutations,
    ...AreaMutations,
    ...TickMutations
  },
  Query: {
    ...MediaQueries,
    ...AreaQueries,
    ...TickQueries,
    ...HistoryQueries,

    // Future To-do: Move climbs and areas' mutations/queries to their own folder Media, Tick, History
    climb: async (
      _,
      { uuid }: QueryByIdType,
      { dataSources }) => {
      const { areas }: { areas: AreaDataSource } = dataSources
      if (uuid !== undefined && uuid !== '') {
        return await areas.findOneClimbByUUID(muid.from(uuid))
      }
      return null
    },

    areas: async (
      _,
      { filter, sort }: { filter?: GQLFilter, sort?: Sort },
      { dataSources }
    ) => {
      const { areas }: { areas: AreaDataSource } = dataSources
      const filtered = await areas.findAreasByFilter(filter)
      return filtered.collation({ locale: 'en' }).sort(sort).toArray()
    },

    area: async (_: any,
      { uuid }: QueryByIdType,
      context, info) => {
      const { dataSources } = context
      const { areas }: { areas: AreaDataSource } = dataSources
      if (uuid !== undefined && uuid !== '') {
        return await areas.findOneAreaByUUID(muid.from(uuid))
      }
      return null
    },

    stats: async (parent: any, args: any, { dataSources }) => {
      const { areas }: { areas: AreaDataSource } = dataSources
      return await areas.getStats()
    },

    cragsNear: async (
      node: any,
      args,
      { dataSources }: { dataSources: DataSources<AreaDataSource> }) => {
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

  ...CommonResolvers,
  ...MediaResolvers,
  ...HistoryFieldResolvers,

  Climb: {
    id: (node: ClimbExtType) => (node._id as MUUID).toUUID().toString(),
    uuid: (node: ClimbExtType) => node.metadata.climb_id.toUUID().toString(),

    type: async (node: ClimbExtType) => {
      if (node.type === undefined) {
        return {
          trad: true
        }
      }
      // a hack to return 'bouldering' field instead of boulder bc
      // the client is hard-coded to use 'bouldering'
      return {
        ...node.type,
        bouldering: node.type.boulder || null
      }
    },

    metadata: (node: ClimbExtType) => ({
      ...node.metadata,
      leftRightIndex: node.metadata.left_right_index,
      climb_id: node.metadata.climb_id.toUUID().toString(),
      climbId: node.metadata.climb_id.toUUID().toString(),
      // convert internal Geo type to simple lng,lat
      lng: node.metadata.lnglat.coordinates[0],
      lat: node.metadata.lnglat.coordinates[1]
    }),

    ancestors: (node: ClimbExtType) => node?.ancestors?.split(',') ?? [],

    media: async (node: any, args: any, { dataSources }) => {
      const { areas }: { areas: AreaDataSource } = dataSources
      return await areas.findMediaByClimbId(node._id)
    }
  },

  Area: {
    id: (node: AreaType) => node._id,
    uuid: (node: AreaType) => node.metadata.area_id.toUUID().toString(),

    // New camel case field
    areaName: async (node: AreaType) => node.area_name,

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

    climbs: async (node: AreaType, _, { dataSources: { areas } }) => {
      if ((node?.climbs.length ?? 0) === 0) {
        return []
      }

      const { climbs } = node

      // Test to see if we have actual climb object returned from findOneAreaByUUID()
      if ((climbs[0] as ClimbType)?.name != null) {
        return climbs
      }

      // List of IDs, we need to convert them into actual climbs
      return areas.findManyClimbsByUuids(node.climbs)
    },

    metadata: (node: AreaType) => ({
      ...node.metadata,
      isDestination: node.metadata?.isDestination ?? false,
      leftRightIndex: node.metadata.left_right_index,
      area_id: node.metadata.area_id.toUUID().toString(),
      areaId: node.metadata.area_id.toUUID().toString(),
      // convert internal Geo type to simple lng,lat
      lng: node.metadata.lnglat.coordinates[0],
      lat: node.metadata.lnglat.coordinates[1],
      mp_id: node.metadata.ext_id ?? ''
    }),

    media: async (node: any, args: any, { dataSources }) => {
      const { areas }: { areas: AreaDataSource } = dataSources
      return await areas.findMediaByAreaId(node.metadata.area_id)
    }
  }
}

export const graphqlSchema = makeExecutableSchema({
  typeDefs: [CommonTypeDef, Climb, Area, MediaTypeDef, AreaEditTypeDef, TickTypeDef, HistoryTypeDef],
  resolvers
})
