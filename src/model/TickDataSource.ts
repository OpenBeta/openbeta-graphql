import { MongoDataSource } from 'apollo-datasource-mongodb'
import { TickEditFilterType, TickType } from '../db/TickTypes'
import { getTickModel } from '../db/index.js'

export default class TickDataSource extends MongoDataSource<TickType> {
  tickModel = getTickModel()

  /**
     * @param tick
     * takes in a new tick
     * @returns
     * returns that new tick
     */
  async addTick (tick: TickType): Promise<any> {
    if (tick === undefined || tick === null) {
      throw new Error('Failed to add tick, Reason: a tick was not provided')
    }
    const res: TickType = await this.tickModel.create({ ...tick })
    return res
  }

  /**
   *
   * @param userId
   * takes in the userId and deletes all ticks previously imported
   * from mountain project
   *
   */
  async deleteImportedTicks (userId: String): Promise<any> {
    if (userId === undefined || userId === null) {
      throw new Error('Failed to delete previously imported ticks, Reason: userId was not provided')
    }
    try {
      await this.tickModel.deleteMany({ userId: userId, source: 'MP' })
    } catch (e) {
      throw new Error(e)
    }
  }

  async deleteAllTicks (userId: String): Promise<any> {
    if (userId === undefined || userId === null) {
      throw new Error('Failed to delete previously imported ticks, Reason: userId was not provided')
    }
    try {
      await this.tickModel.deleteMany({ userId: userId })
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
     * @param _id
     * takes in the mongodb _id value of the tick
     * and deletes that tick
     */
  async deleteTick (_id: string): Promise<any> {
    if (_id === undefined) {
      throw new Error('Failed to delete tick, Reason: an Id needs to be provided')
    }
    await this.tickModel.deleteOne({ _id })
  }

  /**
     * @param filter
     * the mongodb _id value of the tick
     * @param updatedTick
     * the changes to be made to the tick
     * @returns
     * the new/updated tick
     */
  async editTick (filter: TickEditFilterType, updatedTick: TickType): Promise<any> {
    if (filter === undefined) {
      throw new Error('Failed to edit tick, Reason: filter is not defined')
    }
    if (updatedTick === undefined || updatedTick === null) {
      throw new Error('Failed to edit tick, Reason: updated tick is not defined')
    }
    const res: TickType | null = await this.tickModel.findOneAndUpdate(filter, updatedTick, { new: true })
    return res
  }

  /**
     * @param ticks
     * takes in an array of ticks, with the Mountain project id already hashed to the open-tacos id
     * @returns
     * an array of ticks, just created in the database
     */
  async importTicks (ticks: TickType[]): Promise<any> {
    if (ticks.length > 0) {
      const res: TickType[] = await this.tickModel.insertMany(ticks)
      return res
    } else {
      throw new Error("Can't import an empty tick list, check your import url or mutation")
    }
  }

  async ticksByUser (userId: string): Promise<any> {
    if (userId != null) {
      const res: TickType[] = await this.tickModel.find({ userId })
      return res
    }
  }

  async ticksByUserAndClimb (userId: string, climbId: string): Promise<any> {
    if (userId != null && climbId != null) {
      const res: TickType[] = await this.tickModel.find({ userId, climbId })
      return res
    }
  }
}
