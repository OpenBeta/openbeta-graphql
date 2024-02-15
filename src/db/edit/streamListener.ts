import mongoose from 'mongoose'
import { ChangeStream, ChangeStreamDocument, ChangeStreamUpdateDocument } from 'mongodb'
import dot from 'dot-object'

import { changelogDataSource } from '../../model/ChangeLogDataSource.js'
import { logger } from '../../logger.js'
import {
  BaseChangeRecordType,
  DBOperation,
  DocumentKind,
  ResumeToken,
  SupportedCollectionTypes,
  UpdateDescription
} from '../ChangeLogType.js'
import { checkVar } from '../index.js'
import { updateAreaIndex, updateClimbIndex } from '../export/Typesense/Client.js'
import { AreaType } from '../AreaTypes.js'
import { exhaustiveCheck } from '../../utils/helpers.js'
import { ClimbType } from '../ClimbTypes.js'

/**
 * Start a new stream listener to track changes
 */
export default async function streamListener (): Promise<ChangeStream> {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return (await createChangeStream()).on('change', onChange)
}

/**
 * The test stream listener awaits all change events
 */
export async function testStreamListener (callback?: (change: ChangeStreamDocument) => void): Promise<ChangeStream> {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return (await createChangeStream()).on('change', async (change: ChangeStreamDocument) => {
    await onChange(change)
    if (callback != null) callback(change)
  })
}

async function createChangeStream (): Promise<ChangeStream> {
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

  return mongoose.connection.watch(pipeline, opts)
}

const onChange = async (change: ChangeStreamDocument): Promise<void> => {
  const { operationType } = change

  switch (operationType) {
    case 'replace':
    case 'update': {
      let dbOp: DBOperation = 'update'
      const source = DocumentKind[change.ns.coll]
      const { fullDocument, _id, updateDescription } = change as ChangeStreamUpdateDocument
      if (fullDocument?._deleting != null) {
        dbOp = 'delete'
      }

      return await recordChange({
        _id: _id as ResumeToken,
        source,
        fullDocument: fullDocument as SupportedCollectionTypes,
        updateDescription,
        dbOp
      })
    }
    case 'insert': {
      const dbOp = 'insert'
      const source = DocumentKind[change.ns.coll]
      const { fullDocument, _id } = change
      return await recordChange({
        _id: _id as ResumeToken,
        source,
        fullDocument: fullDocument as SupportedCollectionTypes,
        dbOp
      })
    }
  }
}

interface ChangeRecordType {
  _id: ResumeToken
  source: DocumentKind
  fullDocument: SupportedCollectionTypes
  updateDescription?: any
  dbOp: DBOperation
}

const recordChange = async ({ source, dbOp, fullDocument, updateDescription, _id }: ChangeRecordType): Promise<void> => {
  fullDocument.kind = source
  switch (source) {
    case DocumentKind.climbs: {
      const newDocument: BaseChangeRecordType = {
        _id,
        dbOp,
        fullDocument,
        updateDescription: dotifyUpdateDescription(updateDescription),
        kind: DocumentKind.climbs
      }
      return await changelogDataSource.record(newDocument).then(async () => await updateClimbIndex(fullDocument as ClimbType, dbOp))
    }
    case DocumentKind.areas: {
      const newDocument: BaseChangeRecordType = {
        _id,
        dbOp,
        fullDocument,
        updateDescription: dotifyUpdateDescription(updateDescription),
        kind: DocumentKind.areas
      }
      return await changelogDataSource.record(newDocument).then(async () => await updateAreaIndex(fullDocument as AreaType, dbOp))
    }
    case DocumentKind.organizations: {
      const newDocument: BaseChangeRecordType = {
        _id,
        dbOp,
        fullDocument,
        updateDescription: dotifyUpdateDescription(updateDescription),
        kind: DocumentKind.organizations
      }
      return await changelogDataSource.record(newDocument).then()
    }
    default:
      exhaustiveCheck(source)
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
