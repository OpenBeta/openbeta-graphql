import { AreaType } from '../../db/AreaTypes'
import { Context } from '../../types'

const AreaQueries = {
  cragsWithin: async (_, { filter }, { dataSources }: Context): Promise<AreaType | null> => {
    const { areas } = dataSources
    const { bbox, zoom } = filter
    return await areas.findCragsWithin(bbox, zoom)
  },

  countries: async (_, params, { dataSources }: Context): Promise<AreaType[]> => {
    const { areas } = dataSources
    return await areas.listAllCountries()
  }

}

export default AreaQueries
