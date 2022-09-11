import mongoose from 'mongoose'
import { ChangeStreamDocument, ChangeStreamUpdateDocument } from 'mongodb'
import * as Diff from 'diff'

import { changelogDataSource } from '../../model/ChangeLogDataSource.js'
import { logger } from '../../logger.js'
import { BaseChangeRecordType, ResumeToken } from '../ChangeLogType.js'
import { checkVar, getChangeLogModel } from '../index.js'

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
          'ns.db': checkVar('MONGO_DBNAME')
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
      const { fullDocument, _id, updateDescription } = change as ChangeStreamUpdateDocument
      if (fullDocument?._deleting != null) {
        dbOp = 'delete'
      }
      void recordChange({ _id: _id as ResumeToken, source, fullDocument, updateDescription, dbOp })
      break
    }
    case 'insert': {
      const dbOp = 'insert'
      const source = change.ns.coll
      const { fullDocument, _id } = change
      void recordChange({ _id: _id as ResumeToken, source, fullDocument, dbOp })
      break
    }
  }
}

interface ChangeRecordType {
  _id: ResumeToken
  source: string
  fullDocument: any | null
  updateDescription?: any
  dbOp: string
}

const recordChange = async ({ source, dbOp, fullDocument, updateDescription, _id }: ChangeRecordType): Promise<void> => {
  switch (source) {
    case 'climbs': {
      // TBD
      break
    }
    case 'areas': {
      fullDocument.kind = source
      const newDocument: BaseChangeRecordType = {
        _id,
        dbOp,
        fullDocument,
        updateDescription,
        kind: 'areas'
      }
      void changelogDataSource.record(newDocument)
      break
    }
    default:
  }
}

const mostRecentResumeId = async (): Promise<any> => {
  // const rs1: ClimbHistoryType[] = await climbHistory.find({}, { 'change._id': 1 }).sort({ 'change._id': -1 }).limit(1).lean()
  // const rs2: AreaHistoryType[] = await areaHistory.find({}, { 'change._id': 1 }).sort({ 'change._id': -1 }).limit(1).lean()

  // const ts1 = rs1[0]
  // const ts2 = rs2[0]

  // if (ts1 === undefined && ts2 === undefined) {
  //   return null
  // }

  // if (ts1 === undefined) {
  //   return ts2.change._id
  // }

  // if (ts2 === undefined) {
  //   return ts1.change._id
  // }

  // return ts1?._id.getTimestamp() > ts2._id.getTimestamp() ? ts1.change._id : ts2.change._id
}
