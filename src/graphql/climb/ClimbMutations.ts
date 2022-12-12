import muid from 'uuid-mongodb'
import { ContextWithAuth } from '../../types.js'

const ClimbMutations = {
  addClimbs: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<string[] | null> => {
    const { climbs: ds } = dataSources
    const { climbs, parentId } = input

    // permission middleware shouldn't send undefined uuid
    // Temporarily disable Auth check
    // if (user?.uuid == null) throw new Error('Missing user uuid')

    const uidList = await ds.addClimbs(muid.from(parentId), climbs)
    return uidList?.map(id => id.toUUID().toString()) ?? null
  },

  deleteClimbs: async (_, { idList }, { dataSources, user }: ContextWithAuth): Promise<number> => {
    const { climbs: ds } = dataSources

    // if (user?.uuid == null) throw new Error('Missing user uuid')
    return await ds.deleteClimbs(muid.v4(), idList as string[])
  }

}

export default ClimbMutations