import { AreaType, BulkAreasGQLQueryInput } from '../../db/AreaTypes'
import { GQLContext } from '../../types'

const AreaQueries = {
  cragsWithin: async (_, { filter }, { dataSources }: GQLContext): Promise<AreaType | null> => {
    const { areas } = dataSources
    const { bbox, zoom } = filter
    return await areas.findCragsWithin(bbox, zoom)
  },

  countries: async (_, params, { dataSources }: GQLContext): Promise<AreaType[]> => {
    const { areas } = dataSources
    return await areas.listAllCountries()
  },

  bulkAreas: async (_: any, params, { dataSources }: GQLContext): Promise<AreaType[]> => {
    const { areas } = dataSources
    const { ancestors, limit, offset } = params as BulkAreasGQLQueryInput
    const DEFAULT_LIMIT = 500
    const MAX_LIMIT = 2000
    const safeLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const safeOffset = offset ?? 0
    return await areas.bulkDownloadAreas(ancestors, safeLimit, safeOffset)
  }
}

export default AreaQueries
