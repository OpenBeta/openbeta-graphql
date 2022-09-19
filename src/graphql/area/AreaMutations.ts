import muuid from 'uuid-mongodb'

import { AreaType } from '../../db/AreaTypes.js'
import { ContextWithAuth } from '../../types.js'
import type MutableAreaDataSource from '../../model/MutableAreaDataSource.js'

const AreaMutations = {

  setDestinationFlag: async (_, { input }, context: ContextWithAuth): Promise<AreaType | null> => {
    const { dataSources, user } = context
    const { areas }: { areas: MutableAreaDataSource } = dataSources
    const { id, flag } = input

    // permission middleware shouldn't send undefined uuid
    if (user?.uuid == null) throw new Error('Missing user uuid')

    return await areas.setDestinationFlag(user.uuid, muuid.from(id), flag)
  },

  addCountry: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<AreaType | null> => {
    const { areas } = dataSources
    const { alpha3ISOCode } = input

    // permission middleware shouldn't send undefined uuid
    if (user?.uuid == null) throw new Error('Missing user uuid')

    return await areas.addCountry(user.uuid, alpha3ISOCode)
  },

  removeArea: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<AreaType | null> => {
    const { areas } = dataSources
    const { uuid } = input

    // permission middleware shouldn't send undefined uuid
    if (user?.uuid == null) throw new Error('Missing user uuid')

    return await areas.deleteArea(user.uuid, muuid.from(uuid))
  },

  addArea: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<AreaType | null> => {
    const { areas } = dataSources
    const { name, parentUuid, countryCode } = input

    // permission middleware shouldn't send undefined uuid
    if (user?.uuid == null) throw new Error('Missing user uuid')

    return await areas.addArea(
      user.uuid, name,
      parentUuid == null ? null : muuid.from(parentUuid),
      countryCode)
  },

  editArea: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<AreaType | null> => {
    const { areas } = dataSources

    if (user?.uuid == null) throw new Error('Missing user uuid')
    if (input?.uuid == null) throw new Error('Missing area uuid')

    const areaUuid = muuid.from(input.uuid)
    return await areas.editArea(
      user.uuid,
      areaUuid,
      input
    )
  }

}

export default AreaMutations
