import { TickType } from '../../db/TickTypes'
import type TickDataSource from '../../model/TickDataSource'

const TickQueries = {
  /* A resolver function that takes in the userId from the input and returns the ticksByUser function
  from the dataSource. */
  userTicks: async (_, input, { dataSources }): Promise<TickType[] | null> => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const { userId } = input

    // supposedly un-needed check
    if (userId == null) {
      throw new Error('Failed to retrieve ticks, Reason: userId was not provided')
    }

    return await ticks.ticksByUser(userId)
  },

  /** a function for retrieving ticks (attempts at climbing a route) by a specific user and climb.
   * The function takes in the user's ID and the climb's ID, and returns an array of tick data that
   * matches the user and climb IDs provided. */
  userTicksByClimbId: async (_, input, { dataSources }): Promise<TickType[] | null> => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const { climbId, userId } = input

    // Supposedly un-needed check
    if (userId == null || climbId == null) {
      throw new Error('Failed to retrieve ticks, Reason: userId was not provided')
    }

    return await ticks.ticksByUserAndClimb(userId, climbId)
  }
}

export default TickQueries
