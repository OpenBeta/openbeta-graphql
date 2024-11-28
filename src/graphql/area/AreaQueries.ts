import { AreaType } from '../../db/AreaTypes'
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
  }

}

export default AreaQueries
