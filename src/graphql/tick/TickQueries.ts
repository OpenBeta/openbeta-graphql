import { TickType } from '../../db/TickTypes'
import type TickDataSource from '../../model/TickDataSource'

const TickQueries = {
  userTicks: async (_, input, { dataSources }): Promise<TickType[] | null> => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const { userId } = input
    return await ticks.ticksByUser(userId)
  },
  userTicksByClimbId: async (_, input, { dataSources }): Promise<TickType[] | null> => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const { climbId, userId } = input
    return await ticks.ticksByUserAndClimb(userId, climbId)
  }
}

export default TickQueries
