import { makeExecutableSchema } from '@graphql-tools/schema'
import { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import muid from 'uuid-mongodb'

import { typeDef as Climb } from './ClimbTypeDef.js'
import { typeDef as Area } from './AreaTypeDef.js'
import { GQLFilter, Sort } from '../types'
import { AreaType } from '../db/AreaTypes.js'
import { ClimbExtType } from '../db/ClimbTypes.js'
import AreaDataSource from '../model/AreaDataSource.js'

interface IdQueryType {
  id?: string
  uuid?: string
}

interface DataSourcesType {
  areas: AreaDataSource
}

const resolvers = {
  Query: {
    climb: async (
      _,
      { id, uuid }: IdQueryType,
      { dataSources }) => {
      const { areas }: DataSourcesType = dataSources
      if (id !== undefined && id !== '') {
        return await areas.findOneClimbById(id)
      }
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
      const { areas }: {areas: AreaDataSource} = dataSources
      const filtered = await areas.findAreasByFilter(filter)
      return filtered.collation({ locale: 'en' }).sort(sort).toArray()
    },

    area: async (_: any,
      { id, uuid }: IdQueryType,
      { dataSources }) => {
      const { areas }: {areas: AreaDataSource} = dataSources
      if (id !== undefined && id !== '') {
        return await areas.findOneById(id)
      }
      if (uuid !== undefined && uuid !== '') {
        return await areas.findOneAreaByUUID(muid.from(uuid))
      }
      return null
    },

    stats: async (parent: any, args: any, { dataSources }) => {
      const { areas }: {areas: AreaDataSource} = dataSources
      return await areas.getStats()
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
    id: (node: ClimbExtType) => node._id,
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

    ancestors: (node: ClimbExtType) => node.ancestors.split(',')
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

    metadata: (node: AreaType) => ({
      ...node.metadata,
      leftRightIndex: node.metadata.left_right_index,
      area_id: node.metadata.area_id.toUUID().toString(),
      areaId: node.metadata.area_id.toUUID().toString(),
      // convert internal Geo type to simple lng,lat
      lng: node.metadata.lnglat.coordinates[0],
      lat: node.metadata.lnglat.coordinates[1]
    })
  }
}

export const graphqlSchema = makeExecutableSchema({
  typeDefs: [Climb, Area],
  resolvers
})
