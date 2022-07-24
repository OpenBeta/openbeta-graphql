import mongose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { OperationType as AreaOpType } from './AreaTypes.js'

export interface ChangeLogType {
  _id: mongose.Types.ObjectId
  editedBy: MUUID
  cols: string[]
  operation: OpType
}

export type OpType = AreaOpType
