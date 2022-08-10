import muuid from 'uuid-mongodb'

import { AreaType } from '../../db/AreaTypes.js'
import { ContextWithAuth } from '../../types.js'
import type MutableAreaDataSource from '../../model/MutableAreaDataSource.js'

const AreaMutations = {
  setDestinationFlag: async (_, { input }, { dataSources }): Promise<AreaType | null> => {
    const { areas }: { areas: MutableAreaDataSource } = dataSources
    const { id, flag } = input
    const user = muuid.v4()
    return await areas.setDestinationFlag(user, muuid.from(id), flag)
  },

  addCountry: async (_, { input }, context): Promise<AreaType | null> => {
    console.log('#addCountry', context)
    const { dataSources, user } = context
    const { areas }: { areas: MutableAreaDataSource } = dataSources
    const { isoCode } = input
    return await areas.addCountry(user, isoCode)
  }

}

export default AreaMutations
