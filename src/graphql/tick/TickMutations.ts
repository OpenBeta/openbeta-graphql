import mongoose from 'mongoose'
import { TickType } from '../../db/TickTypes'
import type TickDataSource from '../../model/TickDataSource'

const TickMutations = {
  addTick: async (
    _,
    { input },
    { dataSources }) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const tick: TickType = input
    return await ticks.addTick(tick)
  },
  deleteTick: async (
    _,
    { _id },
    { dataSources }) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const res = await ticks.deleteTick(_id)
    if (res?.deletedCount === 1) return { _id, removed: true }
    return { _id, removed: false }
  },
  deleteAllTicks: async (
    _,
    { userId },
    { dataSources }) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const res = await ticks.deleteAllTicks(userId)
    if (res?.deletedCount > 0) return { deletedCount: res?.deletedCount, removed: true }
    return { deletedCount: 0, removed: false }
  },
  importTicks: async (
    _,
    { input },
    { dataSources }) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const tickImport: TickType[] = input
    const userId = tickImport[0].userId
    await ticks.deleteImportedTicks(userId)
    return await ticks.importTicks(tickImport)
  },
  editTick: async (
    _,
    { input },
    { dataSources }) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const { _id, updatedTick } = input
    if (updatedTick.dateClimbed != null) {
      const date = new Date(updatedTick.dateClimbed)
      if (!(date instanceof Date && !isNaN(date.getTime()))) {
        throw new Error('Invalid date format')
      }
      updatedTick.dateClimbed = new Date(`${date.toISOString().split('T')[0]}T12:00:00Z`)
    }
    return await ticks.editTick(new mongoose.Types.ObjectId(_id), updatedTick)
  }
}

export default TickMutations
