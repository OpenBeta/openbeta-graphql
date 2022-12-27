import muid from 'uuid-mongodb'
import { ContextWithAuth } from '../../types.js'

const ClimbMutations = {
  addClimbs: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<string[]> => {
    const { climbs: ds } = dataSources
    const { climbs, parentId } = input

    if (user?.uuid == null) throw new Error('Missing user uuid')

    return await ds.addClimbs(user.uuid, muid.from(parentId), climbs)
  },

  updateClimbs: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<string[]> => {
    const { climbs: ds } = dataSources
    const { changes, parentId } = input

    if (user?.uuid == null) throw new Error('Missing user uuid')

    return await ds.updateClimbs(user.uuid, muid.from(parentId), changes)
  },

  deleteClimbs: async (_, { idList }, { dataSources, user }: ContextWithAuth): Promise<number> => {
    const { climbs: ds } = dataSources

    if (user?.uuid == null) throw new Error('Missing user uuid')

    return await ds.deleteClimbs(user.uuid, idList as string[])
  }
}

export default ClimbMutations
