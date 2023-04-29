import mongose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { OperationType as AreaOpType, AreaType } from './AreaTypes.js'
import { ClimbEditOperationType, ClimbType } from './ClimbTypes.js'
import { OperationType as OrganizationOpType, OrganizationType } from './OrganizationTypes.js'

export type DBOperation = 'insert' | 'update' | 'delete'
export enum DocumentKind {
  areas = 'areas',
  climbs = 'climbs',
  organizations = 'organizations'
}

export interface ChangeLogType<T = SupportedCollectionTypes> {
  _id: mongose.Types.ObjectId
  editedBy: MUUID
  operation: OpType
  changes: Array<BaseChangeRecordType<T>>
}

// DIY since ResumeToken is defined as unknown in mongo TS
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
  kind: DocumentKind
}

export type OpType = AreaOpType | ClimbEditOperationType | OrganizationOpType

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
  kind: DocumentKind
}

export type AreaChangeLogType = ChangeLogType<AreaType>
export type AreaChangeRecordType = BaseChangeRecordType<AreaType>

export type ClimbChangeLogType = ChangeLogType<ClimbType>
export type OrganizationChangeLogType = ChangeLogType<OrganizationType>

export type SupportedCollectionTypes =
  | AreaType & WithDiscriminator
  | ClimbType & WithDiscriminator
  | OrganizationType & WithDiscriminator

export interface GetHistoryInputFilterType {
  uuidList: string[]
  userUuid: string
  fromDate: Date
  toDate: Date
}

export interface GetAreaHistoryInputFilterType {
  areaId: string
}

export interface GetOrganizationHistoryInputFilterType {
  orgId: MUUID
}
