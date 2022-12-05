import muid, { MUUID } from 'uuid-mongodb'
import mongoose from 'mongoose'
import { UserInputError } from 'apollo-server'
import { MinimumClimbType, NewClimbInputType } from '../db/ClimbTypes.js'
import ClimbDataSource from './ClimbDataSource.js'
import { sanitizeDisciplines } from '../GradeUtils.js'

export default class MutableClimbDataSource extends ClimbDataSource {
  /**
   * Add one or climbs (or boulder problems) to an area
   * @param parentId parent area id
   * @param climbs
   * @returns a list of newly added climb IDs
   */
  async addClimbs (parentId: MUUID, climbs: NewClimbInputType[]): Promise<MUUID[]|null> {
    const session = await this.areaModel.startSession()
    let ret: MUUID[] | null = null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addClimbs(session, parentId, climbs)
        return ret
      })
    return ret
  }

  async _addClimbs (session, parentId: MUUID, climbs: NewClimbInputType[]): Promise<MUUID[]|null> {
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
      throw new UserInputError('You can only add climbs to a crag (an area that doesn\'t contain other areas)')
    }

    if (!parent.metadata.leaf) {
      // this is the first time we're adding climbs to an area so 'leaf' hasn't been set yet
      parent.metadata.leaf = true
      await parent.save()
    }

    const hasBouldering = climbs.some(entry => entry.disciplines?.bouldering ?? false)

    if (hasBouldering && !(parent.metadata?.isBoulder ?? false)) {
      throw new UserInputError('Adding boulder problems to a route-only area is not allowed')
    }

    const newDocs: MinimumClimbType[] = []

    for (let i = 0; i < climbs.length; i++) {
      if (climbs[i].disciplines == null) {
        throw new UserInputError(`Climb '${climbs[i].name}' [index=${i}] missing 'disciplines' field`)
      }
      const doc: MinimumClimbType = {
        _id: newClimbIds[i],
        name: climbs[i].name,
        fa: '',
        type: sanitizeDisciplines(climbs[i].disciplines),
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
}

export const createInstance = (): MutableClimbDataSource => new MutableClimbDataSource(mongoose.connection.db.collection('climbs'))
