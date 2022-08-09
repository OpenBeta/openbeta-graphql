import muuid from 'uuid-mongodb'

import { AreaType } from '../../db/AreaTypes'
import type MutableAreaDataSource from '../../model/MutableAreaDataSource'

const AreaMutations = {
  setDestinationFlag: async (_, { input }, context): Promise<AreaType|null> => {
    const { dataSources, user } = context
    const { areas }: {areas: MutableAreaDataSource} = dataSources
    const { id, flag } = input
    return await areas.setDestinationFlag(user.uuid, muuid.from(id), flag)
  },

  addCountry: async (_, { input }, context): Promise<AreaType|null> => {
    const { dataSources, user } = context
    const { areas }: {areas: MutableAreaDataSource} = dataSources
    const { alpha3ISOCode } = input
    return await areas.addCountry(user.uuid, alpha3ISOCode)
  },

  removeArea: async (_, { input }, context): Promise<AreaType|null> => {
    const { dataSources, user } = context
    const { areas }: {areas: MutableAreaDataSource} = dataSources
    const { uuid } = input
    return await areas.deleteArea(user.uuid, muuid.from(uuid))
  },

  addArea: async (_, { input }, context): Promise<AreaType|null> => {
    const { dataSources, user } = context
    const { areas }: {areas: MutableAreaDataSource} = dataSources
    const { name, parentUuid } = input
    return await areas.addArea(user.uuid, name, muuid.from(parentUuid))
  }

}

export default AreaMutations
