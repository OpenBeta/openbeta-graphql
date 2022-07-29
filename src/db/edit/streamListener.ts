import mongoose from 'mongoose'
import { ChangeStreamDocument, ResumeToken } from 'mongodb'

import ClimbHistoryType, { AreaHistoryType } from '../ClimbHistoryType.js'
import { getClimbHistoryModel, getAreaHistoryModel } from '../index.js'
import { changelogDataSource } from '../../model/ChangeLogDataSource.js'
import { logger } from '../../logger.js'
import { BaseChangeRecordType } from '../ChangeLogType.js'

const climbHistory = getClimbHistoryModel()
const areaHistory = getAreaHistoryModel()

export default async function streamListener (db: mongoose.Connection): Promise<any> {
  const resumeId = await mostRecentResumeId()
  logger.info({ resumeId }, 'Starting stream listener')

  const opts: any = {
    fullDocument: 'updateLookup'
  }
  if (resumeId != null) {
    opts.resumeId = resumeId
  }

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

  const changeStream = db.watch(pipeline, opts)
  return changeStream.on('change', onChange)
}

const onChange = (change: ChangeStreamDocument): void => {
  const { operationType } = change

  switch (operationType) {
    case 'replace':
    case 'update': {
      let dbOp = 'update'
      const source = change.ns.coll
      const { fullDocument, _id } = change
      if (fullDocument?._deleting != null) {
        dbOp = 'delete'
      }
      recordChange({ _id, source, fullDocument, dbOp })
      break
    }
    case 'insert': {
      const dbOp = 'insert'
      const source = change.ns.coll
      const { fullDocument, _id } = change
      recordChange({ _id, source, fullDocument, dbOp })
      break
    }
  }
}

interface ChangeRecordType {
  _id: ResumeToken
  source: string
  fullDocument: any | null
  dbOp: string
}

const recordChange = (data: ChangeRecordType): void => {
  const { source, dbOp, fullDocument, _id } = data
  switch (source) {
    case 'climbs': {
      // console.log('#climb change', userOpType, fullDocument)
      // const newDocument: ClimbHistoryType = {
      //   uid: muuid.v4(),
      //   actionType: userOpType,
      //   change: data
      // }
      // void climbHistory.insertMany(newDocument)
      break
    }
    case 'areas': {
      // console.log('#area change', userOpType, fullDocument)
      fullDocument.kind = source
      const newDocument: BaseChangeRecordType = {
        _id,
        dbOp,
        fullDocument,
        kind: 'areas'
      }
      void changelogDataSource.record(newDocument)
      break
    }
    default:
  }
}

const mostRecentResumeId = async (): Promise<any> => {
  const rs1: ClimbHistoryType[] = await climbHistory.find({}, { 'change._id': 1 }).sort({ 'change._id': -1 }).limit(1).lean()
  const rs2: AreaHistoryType[] = await areaHistory.find({}, { 'change._id': 1 }).sort({ 'change._id': -1 }).limit(1).lean()

  const ts1 = rs1[0]
  const ts2 = rs2[0]

  if (ts1 === undefined && ts2 === undefined) {
    return null
  }

  if (ts1 === undefined) {
    return ts2.change._id
  }

  if (ts2 === undefined) {
    return ts1.change._id
  }

  return ts1?._id.getTimestamp() > ts2._id.getTimestamp() ? ts1.change._id : ts2.change._id
}
