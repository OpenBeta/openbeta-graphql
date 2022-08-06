import muid from 'uuid-mongodb'

import { AreaType } from '../../db/AreaTypes'
import type MutableAreaDataSource from '../../model/MutableAreaDataSource'

const AreaMutations = {
  setDestinationFlag: async (_, { input }, { dataSources }): Promise<AreaType|null> => {
    const { areas }: {areas: MutableAreaDataSource} = dataSources
    const { id, flag } = input
    return await areas.setDestinationFlag(muid.from(id), flag)
  },

  addCountry: async (_, { input }, context): Promise<AreaType|null> => {
    console.log('#addCountry', context)
    const { dataSources } = context
    const { areas }: {areas: MutableAreaDataSource} = dataSources
    const { isoCode } = input
    return await areas.addCountry(isoCode)
  }

}

export default AreaMutations
