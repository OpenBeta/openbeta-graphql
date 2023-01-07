import mongose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { OperationType as AreaOpType, AreaType } from './AreaTypes.js'
import { ClimbType } from './ClimbTypes.js'

export type DBOperation = 'insert' | 'update' | 'delete'

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

export interface UpdateDescription {
  updatedFields?: string[]
  removedFields?: string[]
  truncatedArrays?: any[]
}
export interface BaseChangeRecordType<FullDocumentType = SupportedCollectionTypes> {
  _id: ResumeToken
  dbOp: DBOperation
  fullDocument: FullDocumentType
  updateDescription: UpdateDescription
  kind: string
}

export type OpType = AreaOpType

export interface ChangeRecordMetadataType {
  /** The UUID of the user to whom this change of the document is attributed  */
  user: MUUID
  operation: OpType
  /**
   * We identify history entries in the audit trail by assigning it an ObjectID.
   **/
  historyId: mongose.Types.ObjectId
  prevHistoryId?: mongose.Types.ObjectId
  seq: number
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

export interface GetAreaHistoryInputFilterType {
  areaId: string
}
