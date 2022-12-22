import muid, { MUUID } from 'uuid-mongodb'
import { UserInputError } from 'apollo-server'
import { ClimbChangeDocType, ClimbChangeInputType } from '../db/ClimbTypes.js'
import ClimbDataSource from './ClimbDataSource.js'
import { sanitizeDisciplines, gradeContextToGradeScales, createGradeObject } from '../GradeUtils.js'
import { getClimbModel } from '../db/ClimbSchema.js'
import { AreaType } from '../db/AreaTypes.js'

export default class MutableClimbDataSource extends ClimbDataSource {
  /**
   * Add one or climbs (or boulder problems) to an area
   * @param parentId parent area id
   * @param climbs
   * @returns a list of newly added climb IDs
   */
  async addClimbs (parentId: MUUID, climbs: ClimbChangeInputType[]): Promise<MUUID[]> {
    const session = await this.areaModel.startSession()
    let ret: MUUID[]

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addClimbs(session, true, parentId, climbs)
        return ret
      })
    // @ts-expect-error
    return ret
  }

  async _addClimbs (session, isNew: boolean, parentId: MUUID, climbs: ClimbChangeInputType[]): Promise<MUUID[]> {
    const newClimbIds = new Array(climbs.length)
    for (let i = 0; i < newClimbIds.length; i++) {
      if (isNew) {
        newClimbIds[i] = muid.v4()
      } else {
        const userinputId = climbs[i]?.id
        if (userinputId == null) throw new Error('Climb.id is required for update operation')
        // for update operation -> uuid string to MUUID
        newClimbIds[i] = muid.from(userinputId)
      }
    }

    const parentFilter = { 'metadata.area_id': parentId }

    let parent: AreaType
    if (isNew) {
      // Adding new climbs:
      // - find the crag node and add the new climb IDs, fail if not found
      parent = await this.areaModel
        .findOneAndUpdate(
          parentFilter,
          {
            $push: {
              climbs: {
                $each: newClimbIds // use $each to insert array of IDs
              }
            }
          }, {
            session
          })
        .orFail(new UserInputError(`Area with id: ${parentId.toUUID().toString()} not found`))
    } else {
      // Updating existing climbs:  simply get the parent node
      parent = await this.areaModel
        .findOne(parentFilter, null, { session })
        .orFail(new UserInputError(`Area with id: ${parentId.toUUID().toString()} not found`))
    }

    if (parent.children.length > 0) {
      throw new UserInputError('You can only add climbs to a crag or a bouldering area (an area that doesn\'t contain other areas)')
    }

    if (!parent.metadata.leaf) {
      // this is the first time we're adding climbs to an area so 'leaf' hasn't been set yet
      parent.metadata.leaf = true
      // @ts-expect-error
      await parent.save()
    }

    // is there at least 1 boulder problem in the input?
    const hasBouldering = climbs.some(entry => entry.disciplines?.bouldering ?? false)

    // input has at least 1 boulder problem AND area is not a bouldering area
    if (hasBouldering && !(parent.metadata?.isBoulder ?? false)) {
      if (parent.climbs.length === 0) {
        // if an area is empty, we're allowed to turn to into a bouldering area
        parent.metadata.isBoulder = true
        // @ts-expect-error
        await parent.save()
      } else {
        if (isNew) {
          throw new UserInputError('Adding boulder problems to a route-only area is not allowed')
        }
      }
    }

    // is there at least 1 non-boulder problem in the input?
    const hasARouteClimb = climbs.some(entry => !(entry.disciplines?.bouldering ?? false))

    if (isNew && hasARouteClimb && (parent.metadata?.isBoulder ?? false)) {
      throw new UserInputError('Adding route climbs to a bouldering area is not allowed')
    }

    const cragGradeScales = gradeContextToGradeScales[parent.gradeContext]
    if (cragGradeScales == null) {
      throw new Error(`Area ${parent.area_name} (${parent.metadata.area_id.toUUID().toString()}) has  invalid grade context: '${parent.gradeContext}'`)
    }

    const newDocs: ClimbChangeDocType[] = []

    for (let i = 0; i < climbs.length; i++) {
      // when adding new climbs we require name and disciplines
      if (isNew && (climbs[i].disciplines == null || climbs[i].name == null)) {
        throw new UserInputError(`Climb '${climbs[i]?.name ?? ''}' [index=${i}] missing 'disciplines' field`)
      }

      const typeSafeDisciplines = sanitizeDisciplines(climbs[i]?.disciplines)

      const grade = climbs[i].grade

      const newGradeObj = grade != null && climbs[i]?.disciplines != null // only update grades when both grade str and disciplines obj exist
        ? createGradeObject(grade, typeSafeDisciplines, cragGradeScales)
        : null

      const doc: ClimbChangeDocType = {
        _id: newClimbIds[i],
        ...climbs[i]?.name != null && { name: climbs[i]?.name },
        fa: '',
        ...newGradeObj != null && { grades: newGradeObj },
        ...typeSafeDisciplines != null && { type: typeSafeDisciplines },
        gradeContext: parent.gradeContext,
        content: {
          description: '',
          location: '',
          protection: ''
        },
        metadata: {
          areaRef: parent.metadata.area_id,
          lnglat: parent.metadata.lnglat,
          left_right_index: climbs[i]?.leftRightIndex != null ? climbs[i].leftRightIndex : i
        }
      }
      newDocs.push(doc)
    }

    if (isNew) {
      const rs = await this.climbModel.insertMany(newDocs, { session, lean: true })
      return rs.map(entry => entry._id)
    } else {
      // bulk update
      const bulk = newDocs.map(doc => ({
        updateOne: {
          filter: { _id: doc._id },
          update: doc
        }
      }))

      const rs = await this.climbModel.bulkWrite(bulk, { session })
      // return original climb IDs if all climbs are updated
      if (rs.nModified === rs.nMatched && rs.nMatched === newClimbIds.length) {
        return newClimbIds
      }
      return []
    }
  }

  async updateClimbs (user, parentId, changes): Promise<MUUID[]> {
    const session = await this.areaModel.startSession()
    let ret: MUUID[]

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addClimbs(session, false, parentId, changes)
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
              _deleting: new Date()
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
