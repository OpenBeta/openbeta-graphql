import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { ClimbSchema } from './ClimbSchema.js'
import { AreaSchema } from './AreaSchema.js'
import ClimbHistoryType, { AreaHistoryType } from './ClimbHistoryType.js'
import ChangeEventType from './ChangeEventType.js'
import { ClimbType } from './ClimbTypes'
import { AreaType } from './AreaTypes'

const { Schema } = mongoose

const schemaOptions = {
  timestamps: { createdAt: 'clusterTime' },
  _id: false
}

const ClimbChangeEventSchema = new mongoose.Schema<ChangeEventType<ClimbType>>({
  _id: {
    _data: Object
  },
  clusterTime: Object,
  operationType: String,
  fullDocument: ClimbSchema
}, schemaOptions)

ClimbChangeEventSchema.index({ _id: 1 }, { unique: true })

const AreaChangeEventSchema = new mongoose.Schema<ChangeEventType<AreaType>>({
  _id: {
    _data: Object
  },
  clusterTime: Object,
  operationType: String,
  fullDocument: AreaSchema
}, schemaOptions)

AreaChangeEventSchema.index({ _id: 1 }, { unique: true })

export const ClimbHistorySchema = new Schema<ClimbHistoryType>({
  uid: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4()
  },
  actionType: {
    type: String
  },
  change: ClimbChangeEventSchema
}, {
  _id: true,
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 5000
  }
})

export const AreaHistorySchema = new Schema<AreaHistoryType>({
  uid: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4()
  },
  actionType: {
    type: String
  },
  change: AreaChangeEventSchema
}, {
  _id: true,
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 5000
  }
})

export const getClimbHistoryModel = (): mongoose.Model<ClimbHistoryType> => {
  return mongoose.model('climb_history', ClimbHistorySchema)
}

export const getAreaHistoryModel = (): mongoose.Model<AreaHistoryType> => {
  return mongoose.model('area_history', AreaHistorySchema)
}
