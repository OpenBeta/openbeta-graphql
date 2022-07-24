import mongoose from 'mongoose'

import { ChangeLogType } from './ChangeLogType'
import { OperationType } from './AreaTypes.js'

const { Schema, connection } = mongoose

const ChangeLogSchema = new Schema<ChangeLogType>({
  editedBy: {
    type: 'object',
    value: { type: 'Buffer' },
    required: true,
    unique: false,
    index: true
  },
  cols: [{ type: String, required: false }],
  operation: {
    type: Schema.Types.Mixed,
    enum: Object.values(OperationType),
    required: true
  }
}, { timestamps: { createdAt: true, updatedAt: false } })

ChangeLogSchema.index({ _id: 1 })

export const getChangeLogModel = (): mongoose.Model<ChangeLogType> => {
  return connection.model('change_logs', ChangeLogSchema)
}
