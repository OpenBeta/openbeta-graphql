import { MongoDataSource } from 'apollo-datasource-mongodb'
import type { DeleteResult } from 'mongodb'
import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import { TickEditFilterType, TickInput, TickType, TickUserSelectors } from '../db/TickTypes'
import { getTickModel, getUserModel } from '../db/index.js'
import type { User } from '../db/UserTypes'
import { getClimbModel } from '../db/ClimbSchema.js'

export default class TickDataSource extends MongoDataSource<TickType> {
  tickModel = getTickModel()
  userModel = getUserModel()
  climbModel = getClimbModel()
  /**
   * @param tick takes in a new tick
   * @returns new tick
   */
  async addTick (tick: TickInput): Promise<TickType> {
    await this.validateTick(tick)
    return await this.tickModel.create({ ...tick })
  }

  /**
   * Deletes all ticks previously imported from Mountain Project
   * @param userId user to delete ticks of
   */
  async deleteImportedTicks (userId: string): Promise<DeleteResult> {
    try {
      return await this.tickModel.deleteMany({ userId, source: 'MP' })
    } catch (e) {
      throw new Error(e)
    }
  }

  async deleteAllTicks (userId: string): Promise<DeleteResult> {
    try {
      const res = await this.tickModel.deleteMany({ userId })
      return res
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Takes in the MongoDB _id value of the tick and deletes that tick
   * @param _id
   */
  async deleteTick (_id: mongoose.Types.ObjectId): Promise<DeleteResult> {
    try {
      return await this.tickModel.deleteOne({ _id })
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * @param filter the MongoDB _id value of the tick
   * @param updatedTick the changes to be made to the tick
   * @returns the new/updated tick
   */
  async editTick (filter: TickEditFilterType, updatedTick: TickInput): Promise<TickType | null> {
    await this.validateTick(updatedTick)
    const rs = await this.tickModel.findOneAndUpdate(filter, updatedTick, { new: true })
    return await rs?.toObject() ?? null
  }

  private async validateTick (tick: TickInput): Promise<void> {
    const climbIdAsUUID = muuid.from(tick.climbId)
    const climb = await this.climbModel.findOne({ _id: climbIdAsUUID, _deleting: { $eq: null } }).lean()
    if (climb == null) {
      throw new Error('Climb not found')
    }
    // Some imports from MP have both a route and boulder grade for example The heart route on el cap
    const isBoulderingOnly = (climb.type.bouldering === true) && Object.keys(climb.type).every(key => key === 'bouldering' || climb.type[key] === false)
    // bouldering only. solo, lead, follow, tr only applicable to roped climbs
    if (isBoulderingOnly) {
      if ((!['Send', 'Flash', 'Attempt'].includes(tick.attemptType)) || (['Lead', 'Solo', 'Tr', 'Follow'].includes(tick.style))) {
        throw new Error('Invalid attempt type or style for bouldering')
      }
    // Only applicable to boulders or roped climbs with "lead" style
    } else if (!(tick.style === 'Lead')) {
      if ((['Attempt', 'Redpoint', 'Pinkpoint', 'Flash', 'Onsight'].includes(tick.attemptType))) {
        throw new Error('Invalid attempt type for a non-lead style')
      }
    }
  }

  /**
   * @param ticks an array of ticks, with the Mountain Project id already hashed to the OpenTacos id
   * @returns an array of ticks, just created in the database
   */
  async importTicks (ticks: TickInput[]): Promise<TickType[]> {
    if (ticks.length > 0) {
      const res: TickType[] = await this.tickModel.insertMany(ticks)
      return res
    } else {
      throw new Error("Can't import an empty tick list, check your import url or mutation")
    }
  }

  /**
   * Retrieve ticks of a user given their details
   * @param userSelectors Attributes that can be used to identify the user
   * @returns
   */
  async ticksByUser (userSelectors: TickUserSelectors): Promise<TickType[]> {
    const { userId: requestedUserId, username } = userSelectors
    if (requestedUserId == null && username == null) {
      throw new Error('Username or userId must be supplied')
    }
    const filters: any[] = []
    if (requestedUserId != null) {
      filters.push({ _id: requestedUserId })
    }
    if (username != null) {
      filters.push({
        'usernameInfo.username': {
          $exists: true, $eq: username
        }
      })
    }
    const userIdObject = await this.userModel.findOne<Pick<User, '_id'>>(
      { $or: filters },
      { _id: 1 }
    ).lean()
    if (userIdObject == null) {
      throw new Error('No such user')
    }
    // Unfortunately, userIds on ticks are stored as strings not MUUIDs.
    return await this.tickModel
      .find({ userId: userIdObject._id.toUUID().toString() })
      .sort({ dateClimbed: -1 })
      .lean()
  }

  /**
   * Get all ticks by climb uuid and optional user uuid
   * @param userId Optional user uuid
   * @param climbId climb uuid
   */
  async ticksByUserIdAndClimb (climbId: string, userId?: string): Promise<TickType[]> {
    return await this.tickModel
      .find({ ...(userId != null && { userId }), climbId })
      .sort({ dateClimbed: -1 })
      .lean()
  }

  static instance: TickDataSource

  static getInstance (): TickDataSource {
    if (TickDataSource.instance == null) {
      TickDataSource.instance = new TickDataSource({ modelOrCollection: mongoose.connection.db.collection('ticks') })
    }
    return TickDataSource.instance
  }
}
