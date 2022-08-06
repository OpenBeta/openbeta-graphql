import mongoose from 'mongoose'

import { ChangeLogType, SupportedCollectionTypes } from './ChangeLogType'
import { OperationType } from './AreaTypes.js'

const { Schema, connection } = mongoose

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

export const getChangeLogModel = (): mongoose.Model<ChangeLogType<any>> => {
  return connection.model('change_logs', ChangeLogSchema)
}
