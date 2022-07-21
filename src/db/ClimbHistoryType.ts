import { Document } from 'mongodb'
import { MUUID } from 'uuid-mongodb'
import ChangeEventType from './ChangeEventType'
import { ClimbType } from './ClimbTypes'
import { AreaType } from './AreaTypes'

export default interface ClimbHistoryType extends Document{
  uid: MUUID
  event: ChangeEventType<ClimbType>
}

export interface AreaHistoryType extends Document {
  uid: MUUID
  event: ChangeEventType<AreaType>
}
