import { TickByClimbSelectors, TickType, TickUserSelectors } from '../../db/TickTypes'
import type TickDataSource from '../../model/TickDataSource'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500

const TickQueries = {
  userTicks: async (_, input: TickUserSelectors, { dataSources }): Promise<TickType[] | null> => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const { limit, offset, ...selectors } = input
    const safeLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const safeOffset = offset ?? 0
    return await ticks.ticksByUser(selectors, safeLimit, safeOffset)
  },
  userTicksByClimbId: async (_, input: TickByClimbSelectors, { dataSources }): Promise<TickType[] | null> => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const { climbId, userId, limit, offset } = input
    const safeLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const safeOffset = offset ?? 0
    return await ticks.ticksByUserIdAndClimb(climbId, userId, safeLimit, safeOffset)
  }
}

export default TickQueries
