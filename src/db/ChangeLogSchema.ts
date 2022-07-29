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

const ChangeSchema = new Schema<Omit<BaseChangeRecordType<any>, 'fullDocument'>>({
  _id: {
    _data: Object
  },
  dbOp: String
},
{ discriminatorKey: 'kind', _id: false }
)

const ChangeLogSchema = new Schema<ChangeLogType<any>>({
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
  changes: [ChangeSchema]
}, { timestamps: { createdAt: true, updatedAt: false } })

const changeArray = ChangeLogSchema.path('changes')

// @ts-expect-error
changeArray.discriminator('climbs', ClimbChangeSchema)
// @ts-expect-error
changeArray.discriminator('areas', AreaChangeSchema)

export const getChangeLogModel = (): mongoose.Model<ChangeLogType<SupportedCollectionTypes>> => {
  return connection.model('change_logs', ChangeLogSchema)
}
