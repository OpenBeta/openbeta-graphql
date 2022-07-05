import muid from 'uuid-mongodb'

import { AreaType } from '../../db/AreaTypes'
import type AreaDataSource from '../../model/AreaDataSource'

const AreaMutations = {
  setDestinationFlag: async (_, { input }, { dataSources }): Promise<AreaType|null> => {
    const { areas }: {areas: AreaDataSource} = dataSources
    const { id, flag } = input
    return await areas.setDestinationFlag(muid.from(id), flag)
  }
}

export default AreaMutations
