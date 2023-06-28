import { TickType, TickUserSelectors } from '../../db/TickTypes'
import type TickDataSource from '../../model/TickDataSource'

const TickQueries = {
  userTicks: async (_, input: TickUserSelectors, { dataSources }): Promise<TickType[] | null> => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    return await ticks.ticksByUser(input)
  },
  userTicksByClimbId: async (_, input, { dataSources }): Promise<TickType[] | null> => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const { climbId, userId } = input
    return await ticks.ticksByUserIdAndClimb(userId, climbId)
  }
}

export default TickQueries
