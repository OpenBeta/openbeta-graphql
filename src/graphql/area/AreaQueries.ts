import { AreaType } from '../../db/AreaTypes'
import type AreaDataSource from '../../model/AreaDataSource'

const AreaQueries = {
  cragsWithin: async (_, { filter }, { dataSources }): Promise<AreaType|null> => {
    const { areas }: {areas: AreaDataSource} = dataSources
    const { bbox, zoom } = filter
    return await areas.findCragsWithin(bbox, zoom)
  }
}

export default AreaQueries
