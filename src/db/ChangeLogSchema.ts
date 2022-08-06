import mongoose from 'mongoose'

import { ChangeLogType, BaseChangeRecordType, SupportedCollectionTypes } from './ChangeLogType'
import { OperationType } from './AreaTypes.js'
import { ClimbSchema } from './ClimbSchema'
import { AreaSchema } from './AreaSchema'

const { Schema, connection } = mongoose

const ClimbChangeSchema = new Schema<any>({
  fullDocument: ClimbSchema
},
{ _id: false }
)

const AreaChangeSchema = new Schema<any>({
  fullDocument: AreaSchema
},
{ _id: false }
)

const ChangeSchema = new Schema<BaseChangeRecordType<any>>({
  _id: {
    _data: Object
  },
  dbOp: String,
  fullDocument: { type: Schema.Types.Mixed }
},
{ _id: false }
)

const ChangeLogSchema = new Schema<ChangeLogType<SupportedCollectionTypes>>({
  editedBy: {
    type: 'object',
    value: { type: 'Buffer' },
    required: true,
    unique: false,
    index: true
  },
  operation: {
    type: Schema.Types.Mixed,
    enum: Object.values(OperationType),
    required: true
  },
  changes: [{ type: Schema.Types.Mixed }]
}, { timestamps: { createdAt: true, updatedAt: false } })

// const changeArray = ChangeLogSchema.path('changes')

// ChangeSchema.discriminator('climbs', ClimbChangeSchema)
// ChangeSchema.discriminator('areas', AreaChangeSchema)

export const getChangeLogModel = (): mongoose.Model<ChangeLogType<any>> => {
  return connection.model('change_logs', ChangeLogSchema)
}
