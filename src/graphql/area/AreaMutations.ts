import muuid from 'uuid-mongodb'

import { AreaType } from '../../db/AreaTypes'
import type MutableAreaDataSource from '../../model/MutableAreaDataSource'

const AreaMutations = {
  setDestinationFlag: async (_, { input }, { dataSources }): Promise<AreaType | null> => {
    const { areas }: { areas: MutableAreaDataSource } = dataSources
    const { id, flag } = input
    const user = muuid.v4()
    return await areas.setDestinationFlag(user, muuid.from(id), flag)
  },

  addCountry: async (_, { input }, context): Promise<AreaType | null> => {
    console.log('#addCountry', context)
    const { dataSources } = context
    const { areas }: { areas: MutableAreaDataSource } = dataSources
    const { isoCode } = input
    const user = muuid.v4()
    return await areas.addCountry(user, isoCode)
  }

}

export default AreaMutations
