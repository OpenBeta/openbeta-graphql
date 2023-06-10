import { MongoDataSource } from 'apollo-datasource-mongodb'
import type { DeleteResult } from 'mongodb'
import mongoose from 'mongoose'

import { TickEditFilterType, TickInput, TickType } from '../db/TickTypes'
import { getTickModel } from '../db/index.js'

export default class TickDataSource extends MongoDataSource<TickType> {
  tickModel = getTickModel()

  /**
   * @param tick takes in a new tick
   * @returns new tick
   */
  async addTick (tick: TickInput): Promise<TickType> {
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
    return await this.tickModel.findOneAndUpdate(filter, updatedTick, { new: true })
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

  async ticksByUser (userId: string): Promise<TickType[]> {
    return await this.tickModel.find({ userId })
  }

  async ticksByUserAndClimb (userId: string, climbId: string): Promise<TickType[]> {
    return await this.tickModel.find({ userId, climbId })
  }

  static instance: TickDataSource

  static getInstance (): TickDataSource {
    if (TickDataSource.instance == null) {
      TickDataSource.instance = new TickDataSource(mongoose.connection.db.collection('ticks'))
    }
    return TickDataSource.instance
  }
}
