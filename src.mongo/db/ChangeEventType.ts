import { ResumeToken } from 'mongodb'

import { AreaType } from './AreaTypes'
import { ClimbType } from './ClimbTypes'

export default interface ChangeEventType<FDocumentType> {
  _id: ResumeToken
  dbOp: string
  fullDocument: FDocumentType
}
export type AreaChangeType = ChangeEventType<AreaType>
export type ClimbChangeType = ChangeEventType<ClimbType>
export type SupportedChangeTypes = AreaChangeType | ClimbChangeType

export type TrackableTypes = (AreaType & WithDiscriminator) | (ClimbType & WithDiscriminator)
export interface WithDiscriminator {
  kind: string
}
