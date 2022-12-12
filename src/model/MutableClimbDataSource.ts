import muid, { MUUID } from 'uuid-mongodb'
import { UserInputError } from 'apollo-server'
import { MinimumClimbType, NewClimbInputType } from '../db/ClimbTypes.js'
import ClimbDataSource from './ClimbDataSource.js'
import { sanitizeDisciplines, gradeContextToGradeScales, createGradeObject } from '../GradeUtils.js'
import { getClimbModel } from '../db/ClimbSchema.js'

export default class MutableClimbDataSource extends ClimbDataSource {
  /**
   * Add one or climbs (or boulder problems) to an area
   * @param parentId parent area id
   * @param climbs
   * @returns a list of newly added climb IDs
   */
  async addClimbs (parentId: MUUID, climbs: NewClimbInputType[]): Promise<MUUID[]> {
    const session = await this.areaModel.startSession()
    let ret: MUUID[]

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addClimbs(session, parentId, climbs)
        return ret
      })
    // @ts-expect-error
    return ret
  }

  async _addClimbs (session, parentId: MUUID, climbs: NewClimbInputType[]): Promise<MUUID[]> {
    const newClimbIds = new Array(climbs.length)
    for (let i = 0; i < newClimbIds.length; i++) {
      newClimbIds[i] = muid.v4()
    }

    // find the crag node and add the new climb id, fail if not found
    const parent = await this.areaModel
      .findOneAndUpdate(
        { 'metadata.area_id': parentId },
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

    if (parent.children.length > 0) {
      throw new UserInputError('You can only add climbs to a crag or bouldering area (an area that doesn\'t contain other areas)')
    }

    if (!parent.metadata.leaf) {
      // this is the first time we're adding climbs to an area so 'leaf' hasn't been set yet
      parent.metadata.leaf = true
      await parent.save()
    }

    // is there at least 1 boulder problem in the input?
    const hasBouldering = climbs.some(entry => entry.disciplines?.bouldering ?? false)

    // input has at least 1 boulder problem AND area is not a bouldering area
    if (hasBouldering && !(parent.metadata?.isBoulder ?? false)) {
      if (parent.climbs.length === 0) {
        // if an area is empty, we're allowed to turn to into a bouldering area
        parent.metadata.isBoulder = true
        await parent.save()
      } else {
        throw new UserInputError('Adding boulder problems to a route-only area is not allowed')
      }
    }

    // is there at least 1 non-boulder problem in the input?
    const hasARouteClimb = climbs.some(entry => !(entry.disciplines?.bouldering ?? false))

    if (hasARouteClimb && (parent.metadata?.isBoulder ?? false)) {
      throw new UserInputError('Adding route climbs to a bouldering area is not allowed')
    }

    const newDocs: MinimumClimbType[] = []

    const cragGradeScales = gradeContextToGradeScales[parent.gradeContext]
    if (cragGradeScales == null) {
      throw new Error(`Area ${parent.area_name} (${parent.metadata.area_id.toUUID().toString()}) has  invalid grade context: '${parent.gradeContext}'`)
    }

    for (let i = 0; i < climbs.length; i++) {
      if (climbs[i].disciplines == null) {
        throw new UserInputError(`Climb '${climbs[i].name}' [index=${i}] missing 'disciplines' field`)
      }

      const typeSafeDisciplines = sanitizeDisciplines(climbs[i].disciplines)
      const grade = climbs[i].grade
      const doc: MinimumClimbType = {
        _id: newClimbIds[i],
        name: climbs[i].name,
        fa: '',
        grades: grade != null ? createGradeObject(grade, typeSafeDisciplines, cragGradeScales) : {},
        type: typeSafeDisciplines,
        gradeContext: parent.gradeContext,
        content: {
          description: '',
          location: '',
          protection: ''
        },
        metadata: {
          areaRef: parent.metadata.area_id,
          lnglat: parent.metadata.lnglat,
          left_right_index: i
        }
      }
      newDocs.push(doc)
    }

    const rs = await this.collection.insertMany(newDocs, { session })
    return Object.values(rs.insertedIds)
  }

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
