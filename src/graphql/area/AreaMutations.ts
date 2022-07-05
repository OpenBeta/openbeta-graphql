
import { AreaType } from '../../db/AreaTypes'

const AreaMutations = {
  setDestinationFlag: async (_, { input }): Promise<AreaType|null> => {
    const { id, flag } = input
    console.log('#setDestinationFlag()', id, flag)
    return null
  }
}

export default AreaMutations
