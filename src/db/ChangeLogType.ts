import mongose from 'mongoose'
import { MUUID } from 'uuid-mongodb'
import { ResumeToken } from 'mongodb'

import { OperationType as AreaOpType, AreaType } from './AreaTypes.js'
import { ClimbType } from './ClimbTypes.js'

export interface ChangeLogType<T = SupportedCollectionTypes> {
  _id: mongose.Types.ObjectId
  editedBy: MUUID
  operation: OpType
  changes: Array<BaseChangeRecordType<T>>
}

export interface BaseChangeRecordType<FullDocumentType = SupportedCollectionTypes> {
  _id: ResumeToken
  dbOp: string
  fullDocument: FullDocumentType
  kind: string
}

export type OpType = AreaOpType

/** 
 * Metadata (summary) of an auditable event in our audit trail.
 */
export interface ChangeRecordMetadataType {
  /** The ID of the user who performed this operation */
  user: MUUID
  /** What event occurred here? What was done */
  operation: OpType
  /** ID of the history entry in the relevant audit trail */
  changeId: mongose.Types.ObjectId
  /** Seq number of this event */
  seq: number
  /** If this is an addition event, then this is set */
  createdAt?: number
  /** If this is an edit event, then this is set */
  updatedAt?: number
}

export interface WithDiscriminator {
  kind: string
}

export type AreaChangeLogType = ChangeLogType<AreaType>
export type AreaChangeRecordType = BaseChangeRecordType<AreaType>

export type SupportedCollectionTypes = AreaType | ClimbType
