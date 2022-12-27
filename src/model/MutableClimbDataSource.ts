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
  /**
   * Add one or climbs (or boulder problems) to an area
   * @param parentId parent area id
   * @param climbs
   * @returns a list of newly added climb IDs
   */
  async addClimbs (userId: MUUID, parentId: MUUID, climbs: ClimbChangeInputType[]): Promise<string[]> {
    const session = await this.areaModel.startSession()
    let ret: string[]

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addClimbs(userId, session, true, parentId, climbs)
        return ret
      })
    // @ts-expect-error
    return ret
  }

  async _addClimbs (userId: MUUID, session: ClientSession, isNew: boolean, parentId: MUUID, userInput: ClimbChangeInputType[]): Promise<string[]> {
    const newClimbIds = new Array<MUUID>(userInput.length)
    for (let i = 0; i < newClimbIds.length; i++) {
      // make sure there's some input
      if (Object.keys(userInput[i]).length <= 1) {
        throw new UserInputError(`Climb ${userInput[i]?.id ?? ''} doesn't have any updated fields.`)
      }
      if (isNew) {
        newClimbIds[i] = muid.v4()
      } else {
        const userinputId = userInput[i]?.id
        if (userinputId == null) throw new Error('Climb.id is required for update operation')
        // for update operation -> uuid string to MUUID
        newClimbIds[i] = muid.from(userinputId)
      }
    }

    const opType = isNew ? ClimbEditOperationType.addClimb : ClimbEditOperationType.updateClimb
    const change = await changelogDataSource.create(session, userId, opType)

    const parentFilter = { 'metadata.area_id': parentId }

    const parent = await this.areaModel
      .findOne(parentFilter).session(session)
      .orFail(new UserInputError(`Area with id: ${parentId.toUUID().toString()} not found`))

    const _change: ChangeRecordMetadataType = {
      user: userId,
      historyId: change._id,
      prevHistoryId: parent._change?.historyId,
      operation: opType,
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
        if (isNew) {
          throw new UserInputError('Adding boulder problems to a route-only area is not allowed')
        }
      }
    }

    // is there at least 1 non-boulder problem in the input?
    const hasARouteClimb = userInput.some(entry => !(entry.disciplines?.bouldering ?? false))

    if (isNew && hasARouteClimb && (parent.metadata?.isBoulder ?? false)) {
      throw new UserInputError('Adding route climbs to a bouldering area is not allowed')
    }

    const cragGradeScales = gradeContextToGradeScales[parent.gradeContext]
    if (cragGradeScales == null) {
      throw new Error(`Area ${parent.area_name} (${parent.metadata.area_id.toUUID().toString()}) has  invalid grade context: '${parent.gradeContext}'`)
    }

    if (isNew) {
      parent.climbs = parent.climbs.concat(newClimbIds)
    }
    await parent.save()

    const newDocs: ClimbChangeDocType[] = []

    for (let i = 0; i < userInput.length; i++) {
      // when adding new climbs we require name and disciplines
      if (isNew && (userInput[i].disciplines == null || userInput[i].name == null)) {
        throw new UserInputError(`Climb '${userInput[i]?.name ?? ''}' [index=${i}] missing 'disciplines' field`)
      }

      const typeSafeDisciplines = sanitizeDisciplines(userInput[i]?.disciplines)

      const grade = userInput[i].grade

      const newGradeObj = grade != null && userInput[i]?.disciplines != null // only update grades when both grade str and disciplines obj exist
        ? createGradeObject(grade, typeSafeDisciplines, cragGradeScales)
        : null

      const { description, location, protection, name } = userInput[i]

      const doc: ClimbChangeDocType = {
        _id: newClimbIds[i],
        ...name != null && { name: sanitizeStrict(name) },
        fa: '',
        ...newGradeObj != null && { grades: newGradeObj },
        ...typeSafeDisciplines != null && { type: typeSafeDisciplines },
        gradeContext: parent.gradeContext,
        content: {
          ...description != null && { description: sanitize(description) },
          ...location != null && { location: sanitize(location) },
          ...protection != null && { protection: sanitize(protection) }
        },
        metadata: {
          areaRef: parent.metadata.area_id,
          lnglat: parent.metadata.lnglat,
          left_right_index: userInput[i]?.leftRightIndex != null ? userInput[i].leftRightIndex : i
        },
        ...isNew && { createdBy: userId },
        ...!isNew && { updatedBy: userId },
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

    if (isNew) {
      const rs = await this.climbModel.insertMany(newDocs, { session, lean: true })
      return rs.map(entry => entry._id.toUUID().toString())
    } else {
      // bulk update
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
          }]
        }
      }))

      const rs = await this.climbModel.bulkWrite(bulk, { session })
      // return original climb IDs if all climbs are updated
      if (rs.nModified === rs.nMatched && rs.nMatched === newClimbIds.length) {
        return newClimbIds.map(entry => entry.toUUID().toString())
      }
      return []
    }
  }

  async updateClimbs (userId: MUUID, parentId, changes): Promise<string[]> {
    const session = await this.areaModel.startSession()
    let ret: string[]

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addClimbs(userId, session, false, parentId, changes)
        return ret
      })
    // @ts-expect-error
    return ret
  }

  /**
   * Delete one or more climbs by climb ID.
   * @param userId
   * @param idListStr Array of climb IDs
   * @returns number of climbs actually got deleted
   */
  async deleteClimbs (userId: MUUID, idListStr: string[]): Promise<number> {
    const toBeDeletedList = idListStr.map(entry => muid.from(entry))
    const session = await this.areaModel.startSession()
    let ret = 0

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        const filter = {
          _id: { $in: toBeDeletedList },
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
