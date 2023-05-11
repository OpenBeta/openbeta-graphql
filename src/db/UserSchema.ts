import mongoose, { } from 'mongoose'
import muuid from 'uuid-mongodb'

import { ExperimentalUserType, User, UsernameInfo } from './UserTypes.js'

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
  username: { type: Schema.Types.String },
  updatedAt: { type: Schema.Types.Date }
}, { _id: false })

export const UserSchema = new Schema<User>({
  firstName: { type: Schema.Types.String },
  lastName: { type: Schema.Types.String },
  displayName: { type: Schema.Types.String },
  usernameInfo: { type: UsernameSchema, required: false },
  userUuid: { type: Schema.Types.Buffer, subtype: 4, index: true, unique: true },
  // userUuid: {
  //   type: 'object',
  //   value: { type: 'Buffer' },
  //   unique: true,
  //   index: true,
  //   required: true
  // },
  homepage: { type: Schema.Types.String }
}, {
  _id: true,
  timestamps: true
})

/**
 * Create a compound index on user uuid and username to take
 * advantage of covered query.
 */
UserSchema.index({
  userUuid: 1,
  'usernameInfo.username': 1
}, { unique: true, name: 'userUuid_username' })

export const getUserModel = (): mongoose.Model<User> => {
  return mongoose.model('users', UserSchema)
}
