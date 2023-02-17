import muid, { MUUID } from 'uuid-mongodb'
import { UserInputError } from 'apollo-server'
import { ClientSession } from 'mongoose'

import { ClimbChangeDocType, ClimbChangeInputType, ClimbEditOperationType } from '../db/ClimbTypes.js'
import ClimbDataSource from './ClimbDataSource.js'
import { sanitizeDisciplines, gradeContextToGradeScales, createGradeObject } from '../GradeUtils.js'
import { getClimbModel } from '../db/ClimbSchema.js'
import { ChangeRecordMetadataType } from '../db/ChangeLogType.js'
import { changelogDataSource } from './ChangeLogDataSource.js'
import { sanitize, sanitizeStrict } from '../utils/sanitize.js'

export default class MutableClimbDataSource extends ClimbDataSource {
  async _addOrUpdateClimbs (userId: MUUID, session: ClientSession, parentId: MUUID, userInput: ClimbChangeInputType[]): Promise<string[]> {
    const newClimbIds = new Array<MUUID>(userInput.length)
    for (let i = 0; i < newClimbIds.length; i++) {
      // make sure there's some input
      if (Object.keys(userInput[i]).length === 0) {
        throw new UserInputError(`Climb ${userInput[i]?.id ?? ''} doesn't have any updated fields.`)
      }
      const userinputId = userInput[i]?.id

      if (userinputId == null) {
        newClimbIds[i] = muid.v4()
      } else {
        newClimbIds[i] = muid.from(userinputId)
      }
    }

    const existingIds = await this.climbModel.find({ _id: { $in: newClimbIds } }).select('_id')

    interface IdMapType {
      id: MUUID
      existed: boolean
    }
    // A list of ID objects to track whether the ID exists in the DB
    const idList = newClimbIds.reduce<IdMapType[]>((acc, curr) => {
      if (existingIds.some(item => item._id.toUUID().toString() === curr.toUUID().toString())) {
        acc.push({ id: curr, existed: true })
      } else {
        acc.push({ id: curr, existed: false })
      }
      return acc
    }, [])

    const opType = ClimbEditOperationType.updateClimb
    const change = await changelogDataSource.create(session, userId, opType)

    const parentFilter = { 'metadata.area_id': parentId }

    const parent = await this.areaModel
      .findOne(parentFilter).session(session)
      .orFail(new UserInputError(`Area with id: ${parentId.toUUID().toString()} not found`))

    const _change: ChangeRecordMetadataType = {
      user: userId,
      historyId: change._id,
      prevHistoryId: parent._change?.historyId,
      operation: ClimbEditOperationType.updateClimb,
      seq: 0
    }
    parent.set({ _change })

    // does the parent area have subareas?
    if (parent.children.length > 0) {
      throw new UserInputError('You can only add climbs to a crag or a bouldering area (an area that doesn\'t contain other areas)')
    }

    if (!parent.metadata.leaf) {
      // this is the first time we're adding climbs to an area so 'leaf' hasn't been set yet
      parent.metadata.leaf = true
    }

    // is there at least 1 boulder problem in the input?
    const hasBouldering = userInput.some(entry => entry.disciplines?.bouldering ?? false)

    // input has at least 1 boulder problem AND area is not a bouldering area
    if (hasBouldering && !(parent.metadata?.isBoulder ?? false)) {
      if (parent.climbs.length === 0) {
        // if an area is empty, we're allowed to turn to into a bouldering area
        parent.metadata.isBoulder = true
      } else {
        throw new UserInputError('Adding boulder problems to a route-only area is not allowed')
      }
    }

    // It's ok to have empty disciplines obj in the input in case
    // we just want to update other fields.
    // However, if disciplines is non-empty, is there 1 non-boulder problem in the input?
    const hasARouteClimb = userInput.some(({ disciplines }) =>
      disciplines != null && Object.keys(disciplines).length > 0 && !(disciplines?.bouldering ?? false))

    if (hasARouteClimb && (parent.metadata?.isBoulder ?? false)) {
      throw new UserInputError('Adding route climbs to a bouldering area is not allowed')
    }

    const cragGradeScales = gradeContextToGradeScales[parent.gradeContext]
    if (cragGradeScales == null) {
      throw new Error(`Area ${parent.area_name} (${parent.metadata.area_id.toUUID().toString()}) has  invalid grade context: '${parent.gradeContext}'`)
    }

    const newDocs: ClimbChangeDocType[] = []

    for (let i = 0; i < userInput.length; i++) {
      // when adding new climbs we require name and disciplines
      if (!idList[i].existed && userInput[i].name == null) {
        throw new UserInputError(`Can't add new climbs without name.  (Index[index=${i}])`)
      }

      const typeSafeDisciplines = sanitizeDisciplines(userInput[i]?.disciplines)

      const grade = userInput[i].grade

      const newGradeObj = grade != null && userInput[i]?.disciplines != null // only update grades when both grade str and disciplines obj exist
        ? createGradeObject(grade, typeSafeDisciplines, cragGradeScales)
        : null

      const { description, location, protection, name } = userInput[i]

      // Make sure we don't update content = {}
      // See https://www.mongodb.com/community/forums/t/mongoservererror-invalid-set-caused-by-an-empty-object-is-not-a-valid-value/148344/2
      const content = {
        ...description != null && { description: sanitize(description) },
        ...location != null && { location: sanitize(location) },
        ...protection != null && { protection: sanitize(protection) }
      }

      const doc: ClimbChangeDocType = {
        _id: newClimbIds[i],
        ...name != null && { name: sanitizeStrict(name) },
        ...newGradeObj != null && { grades: newGradeObj },
        ...typeSafeDisciplines != null && { type: typeSafeDisciplines },
        gradeContext: parent.gradeContext,
        content: Object.keys(content).length === 0 ? undefined : content,
        metadata: {
          areaRef: parent.metadata.area_id,
          lnglat: parent.metadata.lnglat,
          left_right_index: userInput[i]?.leftRightIndex != null ? userInput[i].leftRightIndex : i
        },
        ...!idList[i].existed && { createdBy: userId },
        ...idList[i].existed && { updatedBy: userId },
        _change: {
          user: userId,
          historyId: change._id,
          prevHistoryId: undefined,
          operation: opType,
          seq: 0
        }
      }
      newDocs.push(doc)
    }

    const bulk = newDocs.map(doc => ({
      updateOne: {
        filter: { _id: doc._id },
        update: [{
          $set: {
            ...doc,
            _change: {
              ...doc._change,
              prevHistoryId: '$_change.historyId'
            }
          }
        }],
        upsert: true
      }
    }))

    const rs = await (await this.climbModel.bulkWrite(bulk, { session })).toJSON()

    if (rs.ok === 1) {
      const idList: MUUID[] = []
      const idStrList: string[] = []
      rs.upserted.forEach(({ _id }) => {
        idList.push(_id)
        idStrList.push(_id.toUUID().toString())
      })

      if (idList.length > 0) {
        parent.set({ climbs: parent.climbs.concat(idList) })
      }
      await parent.save()

      if (idStrList.length === newClimbIds.length) {
        return idStrList
      }
      return newClimbIds.map(entry => entry.toUUID().toString())
    } else {
      return []
    }
  }

  /**
   * Update one or climbs (or boulder problems).  Add climb to the area if it doesn't exist.
   * @param parentId parent area id
   * @param changes
   * @returns a list of updated (or newly added) climb IDs
   */
  async addOrUpdateClimbs (userId: MUUID, parentId: MUUID, changes: ClimbChangeInputType[]): Promise<string[]> {
    const session = await this.areaModel.startSession()
    let ret: string[]

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addOrUpdateClimbs(userId, session, parentId, changes)
        return ret
      })
    // @ts-expect-error
    return ret
  }

  /**
   * Delete one or more climbs by climb ID.
   * @param userId User performing the action
   * @param parentId Parent area ID
   * @param idListStr Array of climb IDs
   * @returns number of climbs was deleted
   */
  async deleteClimbs (userId: MUUID, parentId: MUUID, idList: MUUID[]): Promise<number> {
    const session = await this.areaModel.startSession()
    let ret = 0

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        // Remove climb IDs from parent.climbs[]
        await this.areaModel.updateOne(
          { 'metadata.area_id': parentId },
          {
            $pullAll: { climbs: idList }
          },
          { session })

        // Mark climbs delete
        const filter = {
          _id: { $in: idList },
          _deleting: { $exists: false }
        }
        const rs = await this.climbModel.updateMany(
          filter,
          [{
            $set: {
              _deleting: new Date(),
              updatedBy: userId
            }
          }],
          {
            upserted: false,
            session
          }).lean()
        ret = rs.modifiedCount
      })
    return ret
  }
}

// Why suppress TS error? See: https://github.com/GraphQLGuide/apollo-datasource-mongodb/issues/88
// @ts-expect-error
export const createInstance = (): MutableClimbDataSource => new MutableClimbDataSource(getClimbModel())
