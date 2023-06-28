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

  removeArea: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<AreaType | null> => {
    const { areas } = dataSources
    const { uuid } = input

    // permission middleware shouldn't send undefined uuid
    if (user?.uuid == null) throw new Error('Missing user uuid')

    return await areas.deleteArea(user.uuid, muuid.from(uuid))
  },

  addArea: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<AreaType | null> => {
    const { areas } = dataSources
    const { name, parentUuid, countryCode, experimentalAuthor } = input

    // permission middleware shouldn't send undefined uuid
    if (user?.uuid == null) throw new Error('Missing user uuid')

    return await areas.addArea(
      user.uuid, name,
      parentUuid == null ? null : muuid.from(parentUuid),
      countryCode,
      experimentalAuthor
    )
  },

  updateArea: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<AreaType | null> => {
    const { areas } = dataSources

    if (user?.uuid == null) throw new Error('Missing user uuid')
    if (input?.uuid == null) throw new Error('Missing area uuid')

    const { lat, lng } = input
    if (lat != null && !isLatitude(lat)) throw Error('Invalid latitude')
    if (lng != null && !isLongitude(lng)) throw Error('Invalid longitude')
    if ((lat == null && lng != null) || (lat != null && lng == null)) throw Error('Must provide both latitude and longitude')

    const areaUuid = muuid.from(input.uuid)

    // Except for 'uuid' other fields are optional, check to see if there are any fields
    // besides 'uuid'
    const fields = Object.keys(input).filter(key => key !== 'uuid')
    if (fields.length === 0) return null

    return await areas.updateArea(
      user.uuid,
      areaUuid,
      input
    )
  },

  updateAreasSortingOrder: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<string[] | null> => {
    const { areas } = dataSources

    if (user?.uuid == null) throw new Error('Missing user uuid')
    return await areas.updateSortingOrder(
      user.uuid,
      input
    )
  }
}

export default AreaMutations

const isLatitude = (num: number): boolean => isFinite(num) && Math.abs(num) <= 90
const isLongitude = (num: number): boolean => isFinite(num) && Math.abs(num) <= 180
