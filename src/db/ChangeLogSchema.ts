import mongoose from 'mongoose'

import { ChangeLogType, SupportedCollectionTypes } from './ChangeLogType'
import { OperationType } from './AreaTypes'

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

ChangeLogSchema.index({ createdAt: -1 })
ChangeLogSchema.index({ 'changes.fullDocument.metadata.area_id': 1, 'changes.kind': 1 })
ChangeLogSchema.index({ 'changes.kind': 1 })

export const getChangeLogModel = (): mongoose.Model<ChangeLogType<any>> => {
  return connection.model('change_logs', ChangeLogSchema)
}
