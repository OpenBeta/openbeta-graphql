import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import { ExperimentalUserType, User, UsernameInfo } from './UserTypes'

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

/**
 * Temporary model used to capture user profile during bulk import of Canada data.
 * Use the standard User model instead.
 */
export const getExperimentalUserModel = (): mongoose.Model<ExperimentalUserType> => {
  return mongoose.model('exp_users', ExperimentalUserSchema)
}

const UsernameSchema = new Schema<UsernameInfo>({
  username: { type: Schema.Types.String, required: true },
  canonicalName: { type: Schema.Types.String, required: true }
}, {
  _id: false,
  timestamps: {
    updatedAt: true,
    createdAt: false
  }
})

export const UserSchema = new Schema<User>({
  _id: {
    type: 'object',
    value: { type: 'Buffer' }
  },
  email: { type: Schema.Types.String },
  emailVerified: { type: Schema.Types.Boolean },
  displayName: { type: Schema.Types.String },
  bio: { type: Schema.Types.String },
  website: { type: Schema.Types.String },
  avatar: { type: Schema.Types.String },
  usernameInfo: { type: UsernameSchema, required: false },
  createdBy: {
    type: 'object',
    value: { type: 'Buffer' }
  },
  updatedBy: {
    type: 'object',
    value: { type: 'Buffer' }
  }
}, {
  _id: false,
  timestamps: true
})

/**
 * For sorting by most recent
 */
UserSchema.index({ createdAt: -1 })
UserSchema.index({ 'usernameInfo.canonicalName': 1 }, { sparse: true, unique: true })
UserSchema.index({ 'usernameInfo.username': 1 }, { sparse: true, unique: true })

export const getUserModel = (): mongoose.Model<User> => {
  return mongoose.model('users', UserSchema)
}
