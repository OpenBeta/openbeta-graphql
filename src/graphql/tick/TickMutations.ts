import { TickType } from '../../db/TickTypes'
import type TickDataSource from '../../model/TickDataSource'
import { ContextWithAuth } from '../../types'

const TickMutations = {
  addTick: async (
    _: null,
    { input },
    { dataSources, user }: ContextWithAuth
  ) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const tick: TickType = input

    // check user is logged in
    if (user.uuid === undefined) {
      throw new Error('Failed to add tick, Reason: user is not authenticated')
    }

    // Check that this user it taking ownership of their own tick
    if (user.uuid.toString() !== tick.userId) {
      throw new Error('Failed to add tick, Reason: userId does not match authenticated user')
    }

    return await ticks.addTick(tick)
  },

  deleteTick: async (
    _: null,
    { _id },
    { dataSources, user }: ContextWithAuth) => {
    const { ticks }: { ticks: TickDataSource } = dataSources

    const tickToDelete: TickType | null = await ticks.tickModel.findOne({ _id: _id })

    if (tickToDelete === null) {
      throw new Error('Failed to delete tick, Reason: specified tick does not exist')
    }

    // check user is logged in
    if (user.uuid === undefined) {
      throw new Error('Failed to delete tick, Reason: user is not authenticated')
    }

    // Check that this user it taking ownership of their own tick
    if (user.uuid.toString() !== tickToDelete.userId) {
      throw new Error('Failed to delete tick, Reason: userId does not match authenticated user')
    }

    const res = await ticks.deleteTick(_id)
    if (res?.deletedCount === 1) return { _id: _id, removed: true }
    return { _id: _id, removed: false }
  },

  deleteAllTicks: async (
    _: null,
    __: null,
    { dataSources, user }: ContextWithAuth) => {
    const { ticks }: { ticks: TickDataSource } = dataSources

    // check user is logged in
    if (user.uuid === undefined) {
      throw new Error('Failed to purge ticks, Reason: user is not authenticated')
    }

    const res = await ticks.deleteAllTicks(user.uuid.toString())
    if (res?.deletedCount > 0) return { deletedCount: res?.deletedCount, removed: true }
    return { deletedCount: 0, removed: false }
  },

  importTicks: async (
    _: null,
    { input },
    { dataSources, user }: ContextWithAuth) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    // check user is logged in
    if (user.uuid === undefined) {
      throw new Error('Failed to import ticks, Reason: user is not authenticated')
    }
    const userId = user.uuid.toString()

    // Prevent user from spoofing userId
    const tickImport: TickType[] = (input as TickType[]).map(i => { return { ...i, userId } })
    await ticks.deleteImportedTicks(userId)
    return await ticks.importTicks(tickImport)
  },

  editTick: async (
    _: null,
    { input },
    { dataSources, user }: ContextWithAuth) => {
    const { ticks }: { ticks: TickDataSource } = dataSources
    const { _id, updatedTick } = input

    if (user.uuid === undefined) {
      throw new Error('Failed to import ticks, Reason: user is not authenticated')
    }
    const userId = user.uuid.toString()

    // always sup in userId so that users cannot spoof userId.
    // userID is never trusted to come from the client, it is always
    // taken from their authunticated session.
    return await ticks.editTick(_id, { ...updatedTick, userId })
  }
}

export default TickMutations
