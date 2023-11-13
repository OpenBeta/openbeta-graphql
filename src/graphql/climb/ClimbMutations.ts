import muid, { MUUID } from 'uuid-mongodb'
import { ContextWithAuth } from '../../types'

const ClimbMutations = {
  updateClimbs: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<string[]> => {
    const { climbs: ds } = dataSources
    const { changes, parentId } = input

    if (user?.uuid == null) throw new Error('Missing user uuid')

    return await ds.addOrUpdateClimbs(user.uuid, muid.from(parentId), changes)
  },

  deleteClimbs: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<number> => {
    const { climbs: ds } = dataSources

    if (user?.uuid == null) throw new Error('Missing user uuid')

    const { idList, parentId } = input

    const toBeDeletedList: MUUID[] = idList.map(entry => muid.from(entry))

    return await ds.deleteClimbs(user.uuid, muid.from(parentId), toBeDeletedList)
  }
}

export default ClimbMutations
