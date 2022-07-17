import muuid from 'uuid-mongodb'
import mongoose from 'mongoose'
import { ChangeStreamDocument } from 'mongodb'

import ClimbHistoryType, { AreaHistoryType } from '../ClimbHistoryType.js'
import { getClimbHistoryModel, getAreaHistoryModel } from '../index.js'

const climbHistory = getClimbHistoryModel()
const areaHistory = getAreaHistoryModel()

export default async function streamListener (db: mongoose.Connection): Promise<any> {
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

  const resumeId = await mostRecentResumeId()

  const changeStream = db.watch(pipeline, { fullDocument: 'updateLookup', startAfter: resumeId })
  changeStream.on('error', console.log)
  changeStream.on('end', console.log)
  return changeStream.on('change', onChange)
}

const onChange = (change: ChangeStreamDocument): void => {
  const { operationType } = change
  switch (operationType) {
    case 'replace':
    case 'update': {
      let userOpType = 'update'
      const source = change.ns.coll
      const { fullDocument, _id, clusterTime } = change
      if (fullDocument?._deleting != null) {
        userOpType = 'delete'
      }
      recordChange({ _id, clusterTime, source, fullDocument, userOpType })
      break
    }
    case 'insert': {
      const userOpType = 'insert'
      const source = change.ns.coll
      const { fullDocument, _id, clusterTime } = change
      recordChange({ _id, clusterTime, source, fullDocument, userOpType })
      break
    }
  }
}

const recordChange = (data): void => {
  const { source, userOpType } = data
  switch (source) {
    case 'climbs': {
      // console.log('#climb change', userOpType, fullDocument)
      const newDocument: ClimbHistoryType = {
        uid: muuid.v4(),
        actionType: userOpType,
        event: data
      }
      void climbHistory.insertMany(newDocument)
      break
    }
    case 'areas': {
      // console.log('#area change', userOpType, fullDocument)
      const newDocument: AreaHistoryType = {
        uid: muuid.v4(),
        actionType: userOpType,
        event: data
      }
      void areaHistory.insertMany(newDocument)
      break
    }
    default:
  }
}

const mostRecentResumeId = async (): Promise<any> => {
  const rs1 = await climbHistory.find({}, { 'event._id': 1 }).sort({ 'event._id': -1 }).limit(1).lean()
  const rs2 = await areaHistory.find({}, { 'event._id': 1 }).sort({ 'event._id': -1 }).limit(1).lean()

  const ts1 = rs1[0]
  const ts2 = rs2[0]

  if (ts1 === undefined && ts2 === undefined) {
    return null
  }

  if (ts1 === undefined) {
    return ts2.event._id
  }

  if (ts2 === undefined) {
    return ts1.event._id
  }

  return ts1?._id.getTimestamp() > ts2._id.getTimestamp() ? ts1.event._id : ts2.event._id
}
