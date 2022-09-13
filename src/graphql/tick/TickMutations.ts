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
    { input },
    { dataSources }) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const muid: string = input
    return await ticks.deleteTick(muid)
  },
  deleteAllTicks: async (
    _,
    { input },
    { dataSources }) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const userId: string = input;
    return await ticks.deleteAllTicks(userId);
  },
  importTicks: async (
    _,
    { input },
    { dataSources }) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const tickImport: TickType[] = input
    const userId = tickImport[0].userId;
    await ticks.deleteImportedTicks(userId);
    return await ticks.importTicks(tickImport)
  },
  editTick: async (
    _,
    { input },
    { dataSources }) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const { _id, updatedTick } = input
    return await ticks.editTick(_id, updatedTick)
  }
}

export default TickMutations
