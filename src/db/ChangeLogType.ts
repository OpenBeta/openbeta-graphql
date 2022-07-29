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

export interface ChangeRecordMetadataType {
  user: MUUID
  operation: OpType
  changeId: mongose.Types.ObjectId
}

export interface WithDiscriminator {
  kind: string
}

export type AreaChangeLogType = ChangeLogType<AreaType>
export type AreaChangeRecordType = BaseChangeRecordType<AreaType>

export type SupportedCollectionTypes = AreaType | ClimbType
