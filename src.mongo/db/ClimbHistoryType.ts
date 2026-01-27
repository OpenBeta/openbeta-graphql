import { Document } from 'mongodb'
import { MUUID } from 'uuid-mongodb'
import ChangeEventType from './ChangeEventType'
import { ClimbType } from './ClimbTypes'
import { AreaType } from './AreaTypes'

export default interface ClimbHistoryType extends Document {
  uid: MUUID
  actionType: ActionType
  change: ChangeEventType<ClimbType>
}

export interface AreaHistoryType extends Document {
  uid: MUUID
  actionType: ActionType
  change: ChangeEventType<AreaType>
}

export type ActionType = 'update' | 'add' | 'delete'
