import { MongoDataSource } from 'apollo-datasource-mongodb'
import { TickType, UnindentifiedTick } from '../db/TickTypes'
import { getTickModel } from '../db/index.js'
import mongoose from 'mongoose'

interface DeleteResult {
  /** Indicates whether this write result was acknowledged. If not, then all other members of this result will be undefined. */
  acknowledged: boolean
  /** The number of documents that were deleted */
  deletedCount: number
}

export default class TickDataSource extends MongoDataSource<TickType> {
  tickModel = getTickModel()

  /**
   * Climbers may log multiple tick attempts on a given climb, so we allow users to own multiple
   * ticks for a given climb, but documents with truly identical fields are not allowed.
   * We assume all submissions of this kind are duplicates, and were submitted by accident.
   */
  async addTick (tick: TickType | UnindentifiedTick): Promise<TickType> {
    if (tick === undefined || tick === null) {
      throw new Error('Failed to add tick, Reason: a tick was not provided')
    }

    const tickExists = await this.tickModel.findOne({ ...tick })

    if (tickExists != null) {
      throw new Error('Failed to add tick, Reason: a tick with these values already exists')
    }

    return await this.tickModel.create({ ...tick })
  }

  /**
   *
   * @param userId
   * takes in the userId and deletes all ticks previously imported
   * from mountain project
   *
   */
  async deleteImportedTicks (userId: string): Promise<DeleteResult> {
    if (userId === undefined || userId === null) {
      throw new Error('Failed to delete previously imported ticks, Reason: userId was not provided')
    }
    try {
      const res = await this.tickModel.deleteMany({ userId: userId, source: 'MP' })
      return res
    } catch (e) {
      throw new Error(e)
    }
  }

  async deleteAllTicks (userId: string): Promise<DeleteResult> {
    if (userId === undefined || userId === null) {
      throw new Error('Failed to delete previously imported ticks, Reason: userId was not provided')
    }

    return await this.tickModel.deleteMany({ userId: userId })
  }

  /**
     * @param _id
     * takes in the mongodb _id value of the tick
     * and deletes that tick
     */
  async deleteTick (_id: string | mongoose.Types.ObjectId): Promise<DeleteResult> {
    if (_id === undefined) {
      throw new Error('Failed to delete tick, Reason: an Id needs to be provided')
    }

    return await this.tickModel.deleteOne({ _id })
  }

  /**
   * pass in a set of new values to apply to a given tick. returns reified changes.
   * Mongoose should validate the input such that users attempting to disown their ticks
   * will have the request rejected.
   * @returns
   * the new/updated tick
   */
  async editTick (tickId: string | mongoose.Types.ObjectId, updatedTick: UnindentifiedTick): Promise<TickType | null> {
    return await this
      .tickModel
      .findOneAndUpdate(
        { _id: tickId },
        // update the dateUpdated field, but otherwise apply the new values
        // without further hangup.
        { ...updatedTick, dateUpdated: new Date() },
        { new: true }
      )
  }

  /**
     * @param ticks
     * takes in an array of ticks, with the Mountain project id already hashed to the open-tacos id
     * @returns
     * an array of ticks, just created in the database
     */
  async importTicks (ticks: TickType[] | UnindentifiedTick[]): Promise<TickType[]> {
    if (ticks.length === 0) {
      throw new Error("Can't import an empty tick list, check your import url or mutation")
    }

    return await this.tickModel.insertMany(ticks)
  }

  async ticksByUser (userId: string): Promise<TickType[]> {
    return await this.tickModel.find({ userId })
  }

  async ticksByUserAndClimb (userId: string, climbId: string): Promise<TickType[]> {
    return await this.tickModel.find({ userId, climbId })
  }
}
