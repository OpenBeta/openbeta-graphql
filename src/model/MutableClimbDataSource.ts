// import { ClimbType } from '../db/ClimbTypes'
import muid, { MUUID } from 'uuid-mongodb'
import { UserInputError } from 'apollo-server'
import { ClimbType } from '../db/ClimbTypes.js'
import ClimbDataSource from './ClimbDataSource.js'
import { sanitizeDisciplines } from '../GradeUtils.js'

type MinimalClimbType = Pick<ClimbType, 'name'>

export default class MutableClimbDataSource extends ClimbDataSource {
  async addClimbs (parentId: MUUID, climbs): Promise<MUUID[]|null> {
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

  async _addClimbs (session, parentId: MUUID, climbs: any[]): Promise<MUUID[]|null> {
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
      .lean()
      .orFail(new UserInputError(`Area with id: ${parentId.toUUID().toString()} not found`))

    if (!parent.metadata.leaf) {
      throw new UserInputError('You can only add climbs to a crag (metadata.leaf=true)')
    }

    for (let i = 0; i < climbs.length; i++) {
      climbs[i]._id = newClimbIds[i]
      climbs[i].fa = ''
      climbs[i].type = sanitizeDisciplines(climbs[i].type)
      climbs[i].content = {
        description: '',
        location: '',
        protection: ''
      }
      climbs[i].metadata = {
        areaRef: parent.metadata.area_id,
        lnglat: parent.metadata.lnglat,
        left_right_index: i
      }
    }

    const rs = await this.collection.insertMany(climbs, { session })
    return Object.values(rs.insertedIds)
  }
}
