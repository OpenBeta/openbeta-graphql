import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import { ExperimentalUserType } from './UserTypes.js'

const { Schema } = mongoose

export const ExperimentalUserSchema = new Schema<ExperimentalUserType>({
  _id: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4()
  },
  displayName: { type: Schema.Types.String, required: true, index: true },
  url: { type: Schema.Types.String, required: true, index: true }
}, {
  _id: false,
  timestamps: true
})

export const getExperimentalUserModel = (): mongoose.Model<ExperimentalUserType> => {
  return mongoose.model('exp_users', ExperimentalUserSchema)
}
