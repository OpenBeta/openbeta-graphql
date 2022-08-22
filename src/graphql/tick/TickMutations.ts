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
  importTicks: async (
    _,
    { input },
    { dataSources }) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const tickImport: TickType[] = input
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
