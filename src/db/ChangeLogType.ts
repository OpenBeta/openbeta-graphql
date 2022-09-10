import mongose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { OperationType as AreaOpType, AreaType } from './AreaTypes.js'
import { ClimbType } from './ClimbTypes.js'

export interface ChangeLogType<T = SupportedCollectionTypes> {
  _id: mongose.Types.ObjectId
  editedBy: MUUID
  operation: OpType
  changes: Array<BaseChangeRecordType<T>>
}

// DIY since ResumeToke is defined as unknown in mongo TS
export interface ResumeToken {
  _data: string
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
  prevChangeId?: mongose.Types.ObjectId
  seq: number
  createdAt?: number
  updatedAt?: number
}

export interface WithDiscriminator {
  kind: string
}

export type AreaChangeLogType = ChangeLogType<AreaType>
export type AreaChangeRecordType = BaseChangeRecordType<AreaType>

export type SupportedCollectionTypes = AreaType | ClimbType

export interface GetHistoryInputFilterType {
  uuidList: string[]
  userUuid: string
  fromDate: Date
  toDate: Date
}
