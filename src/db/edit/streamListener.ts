import muuid from 'uuid-mongodb'
import mongoose from 'mongoose'

import ClimbHistoryType, { AreaHistoryType } from '../ClimbHistoryType.js'
import { getClimbHistoryModel, getAreaHistoryModel } from '../index.js'

const climbHistory = getClimbHistoryModel()
const areaHistory = getAreaHistoryModel()

export default function streamListener (db: mongoose.Connection): void {
  const pipeline = [{
    $match: {
      $and: [
        {
          'ns.db': 'opentacos'
        },
        {
          'ns.coll': {
            $in: ['climbs', 'areas']
          }
        }
      ]
    }
  }]

  const changeStream = db.watch<ClimbHistoryType>(pipeline)
  changeStream.on('change', onChange)
}

const onChange = async (change): Promise<void> => {
  const source = change?.ns?.coll
  switch (source) {
    case 'climbs': {
      const newDocument: ClimbHistoryType = {
        uid: muuid.v4(),
        event: change
      }
      await climbHistory.insertMany([newDocument])
      break
    }
    case 'areas': {
      const newDocument: AreaHistoryType = {
        uid: muuid.v4(),
        event: change
      }
      await areaHistory.insertMany([newDocument])
      break
    }
    default:
  }
}
