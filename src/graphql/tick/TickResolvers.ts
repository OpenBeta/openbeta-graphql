import muuid from 'uuid-mongodb'
import { TickType } from '../../db/TickTypes.js'
import { GQLContext } from '../../types.js'

export const TickResolvers = {
  TickType: {
    user: async (node: TickType, args: any, { dataSources }: GQLContext) => {
      const { users } = dataSources
      return await users.getUserPublicProfileByUuid(muuid.from(node.userId))
    }
  }
}
