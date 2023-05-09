import { makeExecutableSchema } from '@graphql-tools/schema'
import { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import muid from 'uuid-mongodb'
import fs from 'fs'
import { gql } from 'apollo-server'
import { DocumentNode } from 'graphql'

import { CommonResolvers, CommonTypeDef } from './common/index.js'
import { HistoryQueries, HistoryFieldResolvers } from '../graphql/history/index.js'
import { QueryByIdType, GQLFilter, Sort } from '../types'
import { AreaType, CountByDisciplineType } from '../db/AreaTypes.js'
import { ClimbGQLQueryType, ClimbType } from '../db/ClimbTypes.js'
import AreaDataSource from '../model/AreaDataSource.js'
import { MediaMutations, MediaQueries, MediaResolvers } from './media/index.js'
import { PostMutations, PostQueries, PostResolvers } from './posts/index.js'
import { XMediaMutations, XMediaQueries, XMediaResolvers } from './xmedia/index.js'
import { TagMutations, TagQueries, TagResolvers } from './tag/index.js'
import { AreaQueries, AreaMutations } from './area/index.js'
import { ClimbMutations } from './climb/index.js'
import { OrganizationMutations, OrganizationQueries } from './organization/index.js'
import TickMutations from './tick/TickMutations.js'
import TickQueries from './tick/TickQueries.js'
import MediaDataSource from '../model/MediaDataSource.js'
import { getAuthorMetadataFromBaseNode } from '../db/utils/index.js'
import { geojsonPointToLatitude, geojsonPointToLongitude } from '../utils/helpers.js'

/**
 * It takes a file name as an argument, reads the file, and returns a GraphQL DocumentNode.
 * A documentnode represents a validated GraphQL schema document (or part thereof)
 * @param {string} file - The name of the file to load.
 * @returns A DocumentNode
 */
function loadSchema (file: string): DocumentNode {
  return gql(fs.readFileSync(`src/graphql/schema/${file}`).toString())
}

/** Load in the type definitions in the schema directory */
const TickTypeDef = loadSchema('Tick.gql')
const ClimbTypeDef = loadSchema('Climb.gql')
const AreaTypeDef = loadSchema('Area.gql')
const OrganizationTypeDef = loadSchema('Organization.gql')
const MediaTypeDef = loadSchema('Media.gql')
const HistoryTypeDef = loadSchema('History.gql')
const AreaEditTypeDef = loadSchema('AreaEdit.gql')
const OrganizationEditTypeDef = loadSchema('OrganizationEdit.gql')
const ClimbMutationTypeDefs = loadSchema('ClimbEdit.gql')
const PostTypeDef = loadSchema('Post.gql')

const XMediaTypeDef = loadSchema('XMedia.gql')
const TagTypeDef = loadSchema('Tag.gql')

const resolvers = {
  Mutation: {
    ...TagMutations,
    ...XMediaMutations,
    ...PostMutations,
    ...MediaMutations,
    ...AreaMutations,
    ...ClimbMutations,
    ...OrganizationMutations,
    ...TickMutations
  },
  Query: {
    ...TagQueries,
    ...XMediaQueries,
    ...PostQueries,
    ...MediaQueries,
    ...AreaQueries,
    ...TickQueries,
    ...HistoryQueries,
    ...OrganizationQueries,

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
  ...PostResolvers,
  ...XMediaResolvers,
  ...TagResolvers,

  Climb: {
    id: (node: ClimbGQLQueryType) => node._id.toUUID().toString(),
    uuid: (node: ClimbGQLQueryType) => node._id.toUUID().toString(),

    type: async (node: ClimbGQLQueryType) => {
      if (node.type === undefined) {
        return {
          trad: true
        }
      }
      // a hack to return 'bouldering' field instead of boulder bc
      // the client is hard-coded to use 'bouldering'
      return {
        ...node.type
        // bouldering: node.type.bouldering || null
      }
    },

    yds: (node: ClimbGQLQueryType) => node.yds ?? null,

    length: (node: ClimbGQLQueryType) => node.length ?? -1,

    grades: (node: ClimbGQLQueryType) => node.grades ?? null,

    metadata: (node: ClimbGQLQueryType) => {
      const { metadata } = node
      // convert internal Geo type to simple lng,lat
      const lng = geojsonPointToLongitude(metadata.lnglat)
      const lat = geojsonPointToLatitude(metadata.lnglat)
      const climbId = node._id.toUUID().toString()
      return ({
        ...node.metadata,
        leftRightIndex: metadata.left_right_index,
        climb_id: climbId,
        climbId,
        lng,
        lat
      })
    },

    ancestors: (node: ClimbGQLQueryType) => node.ancestors.split(','),

    media: async (node: ClimbType, args: any, { dataSources }) => {
      const { media }: { media: MediaDataSource } = dataSources
      return await media.findMediaByClimbId(node._id, node.name)
    },

    content: (node: ClimbGQLQueryType) => node.content == null
      ? {
          description: '',
          location: '',
          protection: ''
        }
      : node.content,

    authorMetadata: getAuthorMetadataFromBaseNode
  },

  Area: {
    id: (node: AreaType) => node._id,
    uuid: (node: AreaType) => node.metadata.area_id.toUUID().toString(),

    shortCode: (node: AreaType) => node?.shortCode ?? null,

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
      if ((node?.climbs?.length ?? 0) === 0) {
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

    metadata: (node: AreaType) => {
      const { metadata } = node
      // convert internal Geo type to simple lng,lat
      const lng = geojsonPointToLongitude(metadata.lnglat)
      const lat = geojsonPointToLatitude(metadata.lnglat)

      const areaId = node.metadata.area_id.toUUID().toString()

      return ({
        ...node.metadata,
        isDestination: metadata?.isDestination ?? false,
        isBoulder: metadata?.isBoulder ?? false,
        leftRightIndex: metadata?.leftRightIndex ?? -1,
        area_id: areaId,
        areaId,
        lng,
        lat,
        mp_id: metadata.ext_id ?? ''
      })
    },

    media: async (node: any, args: any, { dataSources }) => {
      const { media }: { media: MediaDataSource } = dataSources
      return await media.findMediaByAreaId(node.metadata.area_id, node.ancestors)
    },
    authorMetadata: getAuthorMetadataFromBaseNode
  },

  CountByDisciplineType: {
    // Frontend code still uses "boulder"
    boulder: (node: CountByDisciplineType) => node.bouldering
  }
}

export const graphqlSchema = makeExecutableSchema({
  typeDefs: [
    CommonTypeDef,
    ClimbTypeDef,
    AreaTypeDef,
    OrganizationTypeDef,
    MediaTypeDef,
    AreaEditTypeDef,
    OrganizationEditTypeDef,
    TickTypeDef,
    HistoryTypeDef,
    ClimbMutationTypeDefs,
    PostTypeDef,
    XMediaTypeDef,
    TagTypeDef
  ],
  resolvers,
  inheritResolversFromInterfaces: true
})
