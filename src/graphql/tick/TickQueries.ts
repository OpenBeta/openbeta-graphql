import { TickType } from '../../db/TickTypes'
import type TickDataSource from '../../model/TickDataSource'

const TickQueries = {
  /* A resolver function that takes in the userId from the input and returns the ticksByUser function
  from the dataSource. */
  userTicks: async (_: null, input: { userId: any }, { dataSources }: any): Promise<TickType[] | null> => {
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
  userTicksByClimbId: async (_: null, input: { climbId: any, userId: any }, { dataSources }: any): Promise<TickType[] | null> => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const { climbId, userId } = input

    // Supposedly un-needed check
    if (userId == null || climbId == null) {
      throw new Error('Failed to retrieve ticks, Reason: userId was not provided')
    }

    return await ticks.ticksByUserAndClimb(userId, climbId)
  },

  /**
   * Get recently created ticks, with a limit and page.
   *
   * Based on the disdain shown by the answer here
   * https://stackoverflow.com/questions/5539955/how-to-paginate-with-mongoose-in-node-js
   * We are setting very conservative limits on the number of ticks that can be returned
   * out of the gate.
   *
   * This is not to say that there are not solutions to these issues - I'm just calling
   * it at the time of this implementation that this will not become needed until some
   * unspecified future use-case.
   *
   * Limit may be between 0 and 100
   * Page may scroll 0 through 100
   **/
  recentTicks: async (_: null, input: { limit: any, page: any }, { dataSources }: any): Promise<TickType[]> => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    let { limit, page } = input

    if (typeof limit !== 'number') {
      limit = 50
    }

    if (typeof page !== 'number') {
      page = 0
    }

    limit = Math.min(limit, 100)
    page = Math.min(page, 100)

    return await ticks.tickModel.find()
      .sort({ dateAdded: -1 }) // is it expensive to sort before limiting? Is there a better way?
      .limit(limit)
      .skip(limit * page)
  }
}

export default TickQueries
