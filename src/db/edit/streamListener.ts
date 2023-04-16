import mongoose from 'mongoose'
import { ChangeStream, ChangeStreamDocument, ChangeStreamUpdateDocument } from 'mongodb'
import dot from 'dot-object'

import { changelogDataSource } from '../../model/ChangeLogDataSource.js'
import { logger } from '../../logger.js'
import { BaseChangeRecordType, ResumeToken, UpdateDescription, DBOperation, SupportedCollectionTypes } from '../ChangeLogType.js'
import { checkVar } from '../index.js'
import { updateAreaIndex } from '../export/Typesense/Client.js'
import { AreaType } from '../AreaTypes.js'

/**
 * Start a new stream listener to track changes
 */
export default async function streamListener (): Promise<ChangeStream> {
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
            $in: ['climbs', 'areas', 'organizations']
          }
        }
      ]
    }
  }]

  const changeStream = mongoose.connection.watch(pipeline, opts)
  return changeStream.on('change', onChange)
}

const onChange = (change: ChangeStreamDocument): void => {
  const { operationType } = change

  switch (operationType) {
    case 'replace':
    case 'update': {
      let dbOp: DBOperation = 'update'
      const source = change.ns.coll
      const { fullDocument, _id, updateDescription } = change as ChangeStreamUpdateDocument
      if (fullDocument?._deleting != null) {
        dbOp = 'delete'
      }

      void recordChange({ _id: _id as ResumeToken, source, fullDocument: fullDocument as SupportedCollectionTypes, updateDescription, dbOp })
      break
    }
    case 'insert': {
      const dbOp = 'insert'
      const source = change.ns.coll
      const { fullDocument, _id } = change
      void recordChange({ _id: _id as ResumeToken, source, fullDocument: fullDocument as SupportedCollectionTypes, dbOp })
      break
    }
  }
}

interface ChangeRecordType {
  _id: ResumeToken
  source: string
  fullDocument: SupportedCollectionTypes
  updateDescription?: any
  dbOp: DBOperation
}

const recordChange = async ({ source, dbOp, fullDocument, updateDescription, _id }: ChangeRecordType): Promise<void> => {
  fullDocument.kind = source
  switch (source) {
    case 'climbs': {
      const newDocument: BaseChangeRecordType = {
        _id,
        dbOp,
        fullDocument,
        updateDescription: dotifyUpdateDescription(updateDescription),
        kind: 'climbs'
      }
      void changelogDataSource.record(newDocument)
      break
    }
    case 'areas': {
      const newDocument: BaseChangeRecordType = {
        _id,
        dbOp,
        fullDocument,
        updateDescription: dotifyUpdateDescription(updateDescription),
        kind: 'areas'
      }
      void changelogDataSource.record(newDocument)
      void updateAreaIndex(fullDocument as AreaType, dbOp)
      break
    }
    case 'organizations': {
      const newDocument: BaseChangeRecordType = {
        _id,
        dbOp,
        fullDocument,
        updateDescription: dotifyUpdateDescription(updateDescription),
        kind: 'organizations'
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

// Mongo type
interface UpdateDescriptionType {
  updatedFields?: Object
  removedFields?: Object
  truncatedArrays?: Object
}

/**
 * Convert updated field events to array of fields.  Example:
 * ```
 * updatedFields: {
 *   areaName: 'New name'
 *   children: [ ObjectId ('1231321231241') ]
 * }
 *
 * ==>
 * updatedFields: [
 *  'areaName', 'children'
 * ]
 * ```
 * @see https://www.mongodb.com/docs/manual/reference/change-events/update/#mongodb-data-update
 */
const dotifyUpdateDescription = (updateDescription: UpdateDescriptionType): UpdateDescription => {
  if (updateDescription == null) {
    return {
      updatedFields: [],
      removedFields: [],
      truncatedArrays: []
    }
  }

  const { updatedFields, removedFields, truncatedArrays } = updateDescription
  cleanupObj(updatedFields)
  return {
    updatedFields: updatedFields != null ? Object.keys(dot.dot(updatedFields)) : [],
    removedFields: removedFields != null ? Object.keys(dot.dot(removedFields)) : [],
    truncatedArrays: truncatedArrays != null ? Object.keys(dot.dot(truncatedArrays)) : []
  }
}

const cleanupObj = (obj: any): void => {
  if (obj?.__v != null) {
    delete obj.__v
  }
}
