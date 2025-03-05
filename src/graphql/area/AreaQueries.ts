import muuid, { MUUID } from 'uuid-mongodb'
import { ShadowArea, AreaType, BulkAreasGQLQueryInput } from '../../db/AreaTypes'
import { validate } from 'uuid'
import { IResolverObject } from 'graphql-middleware/dist/types'
import { flatFieldSet } from '../gql-parse.js'
import { GQLContext } from '../../types'
import { DescendantQuery } from '../../model/AreaDataSource'

interface StructureQuery {
  parent: MUUID
  filter: Partial<DescendantQuery>
}

const AreaQueries: IResolverObject = {
  cragsWithin: async (_, { filter }, { dataSources }: GQLContext): Promise<AreaType | null> => {
    const { areas } = dataSources
    const { bbox, zoom } = filter
    return await areas.findCragsWithin(bbox, zoom)
  },

  countries: async (_, params, { dataSources }: GQLContext): Promise<AreaType[]> => {
    const { areas } = dataSources
    return await areas.listAllCountries()
  },

  structure: async (_, params: StructureQuery, { dataSources }: GQLContext, info): Promise<ShadowArea[]> => {
    const { areas } = dataSources
    if (params.parent === undefined) {
      return await areas.descendants(undefined, {
        projection: flatFieldSet(info)[0],
        filter: { ...params.filter, maxDepth: 2 }
      })
    }

    if (!(typeof params.parent === 'string' && validate(params.parent))) {
      throw new Error('Malformed UUID string')
    }

    return await areas.descendants(muuid.from(params.parent), {
      projection: flatFieldSet(info)[0],
      filter: params.filter
    })
  },
  bulkAreas: async (_: any, params, { dataSources }: GQLContext): Promise<AreaType[]> => {
    const { areas } = dataSources
    const { ancestors } = params as BulkAreasGQLQueryInput
    return await areas.bulkDownloadAreas(ancestors)
  }
}

export default AreaQueries
