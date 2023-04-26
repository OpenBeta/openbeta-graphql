import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import { OrganizationType, OrgType, IOrganizationContent, OperationType } from './OrganizationTypes.js'
import { ChangeRecordMetadataType } from './ChangeLogType.js'

const { Schema, connection } = mongoose

const ChangeRecordMetadata = new Schema<ChangeRecordMetadataType>({
  user: {
    type: 'object',
    value: { type: 'Buffer' },
    required: true
  },
  historyId: { type: Schema.Types.ObjectId, ref: 'change_logs' },
  operation: {
    type: Schema.Types.Mixed,
    enum: Object.values(OperationType),
    required: true
  },
  seq: { type: Number, required: true, default: 0 }
}, { _id: false, timestamps: false })

const ContentSchema = new Schema<IOrganizationContent>({
  website: { type: Schema.Types.String },
  email: { type: Schema.Types.String },
  donationLink: { type: Schema.Types.String },
  instagramLink: { type: Schema.Types.String },
  facebookLink: { type: Schema.Types.String },
  description: { type: Schema.Types.String }
}, { _id: false })

export const OrganizationSchema = new Schema<OrganizationType>({
  orgId: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4(),
    required: true,
    unique: true,
    index: true
  },
  displayName: { type: String, required: true, index: true },
  orgType: {
    type: Schema.Types.Mixed,
    enum: Object.values(OrgType),
    required: true
  },
  associatedAreaIds: [{ type: 'Buffer' }],
  excludedAreaIds: [{ type: 'Buffer' }],
  content: ContentSchema,
  _change: ChangeRecordMetadata,
  _deleting: { type: Date },
  updatedBy: {
    type: 'object',
    value: { type: 'Buffer' }
  },
  createdBy: {
    type: 'object',
    value: { type: 'Buffer' }
  }
}, { timestamps: true })

OrganizationSchema.index({ _deleting: 1 }, { expireAfterSeconds: 0 })

export const createOrganizationModel = (name: string = 'organizations'): mongoose.Model<OrganizationType> => {
  return connection.model(name, OrganizationSchema)
}

export const getOrganizationModel = (name: string = 'organizations'): mongoose.Model<OrganizationType> =>
  connection.model(name, OrganizationSchema)
