import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { Point } from '@turf/helpers'
import { GradeScalesTypes } from '@openbeta/sandbag'

import { ClimbType, IClimbMetadata, IClimbContent, SafetyType, ClimbEditOperationType } from './ClimbTypes.js'
import { GradeContexts } from '../GradeUtils.js'
import { ChangeRecordMetadataType } from './ChangeLogType.js'

const { Schema } = mongoose

const ChangeRecordMetadata = new Schema<ChangeRecordMetadataType>({
  user: {
    type: 'object',
    value: { type: 'Buffer' },
    required: true
  },
  historyId: { type: Schema.Types.ObjectId, ref: 'change_logs' },
  prevHistoryId: { type: Schema.Types.ObjectId, ref: 'change_logs' },
  operation: {
    type: Schema.Types.Mixed,
    enum: Object.values(ClimbEditOperationType),
    required: true
  },
  seq: { type: Number, required: true, default: 0 }
}, { _id: false, timestamps: false })

export const PointSchema = new mongoose.Schema<Point>({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  }
}, { _id: false })

const ContentSchema = new Schema<IClimbContent>({
  description: { type: Schema.Types.String, required: false },
  protection: { type: Schema.Types.String, required: false },
  location: { type: Schema.Types.String, required: false }
}, { _id: false })

const MetadataSchema = new Schema<IClimbMetadata>({
  lnglat: {
    type: PointSchema,
    index: '2dsphere'
  },
  left_right_index: { type: Number, required: true, default: -1 },
  mp_id: { type: String, required: false },
  mp_crag_id: { type: String, required: true },
  areaRef: {
    type: Schema.Types.Mixed,
    value: { type: 'Buffer' },
    required: true,
    ref: 'areas'
  }
}, { _id: false })

const PitchSchema = new mongoose.Schema({
  _id: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4()
  },
  uuid: {
    type: 'string',
    default: function () { return this._id.toString() }
  },
  parentId: { type: String, required: true },
  number: { type: Number, required: true },
  grades: { type: mongoose.Schema.Types.Mixed },
  type: { type: mongoose.Schema.Types.Mixed },
  length: { type: Number },
  boltsCount: { type: Number },
  description: { type: String }
}, {
  _id: true,
  timestamps: true
})

const GradeTypeSchema = new Schema<GradeScalesTypes>({
  vscale: Schema.Types.String,
  yds: { type: Schema.Types.String, required: false },
  ewbank: { type: Schema.Types.String, required: false },
  french: { type: Schema.Types.String, required: false },
  font: { type: Schema.Types.String, required: false },
  UIAA: { type: Schema.Types.String, required: false }
}, { _id: false })

export const ClimbSchema = new Schema<ClimbType>({
  _id: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4()
  },
  name: { type: Schema.Types.String, required: true, index: true },
  yds: { type: Schema.Types.String, required: true },
  grades: GradeTypeSchema,
  gradeContext: { type: String, enum: Object.values(GradeContexts), required: false },
  fa: { type: Schema.Types.String, required: false },
  type: { type: Schema.Types.Mixed },
  safety: {
    type: Schema.Types.String,
    enum: Object.values(SafetyType),
    required: true
  },
  boltsCount: { type: Schema.Types.Number, required: false },
  pitches: { type: [PitchSchema], default: undefined, required: false },
  metadata: MetadataSchema,
  content: ContentSchema,
  _deleting: { type: Date },
  updatedBy: {
    type: 'object',
    value: { type: 'Buffer' }
  },
  createdBy: {
    type: 'object',
    value: { type: 'Buffer' }
  },
  _change: ChangeRecordMetadata
}, {
  _id: false,
  timestamps: true
})

ClimbSchema.index({ _deleting: 1 }, { expireAfterSeconds: 0 })

ClimbSchema.pre('validate', function (next) {
  if (this.safety as string === '') { this.safety = SafetyType.UNSPECIFIED }
  if (this.yds === '') { this.yds = 'UNKNOWN' }
  next()
})

export const getClimbModel = (name: string = 'climbs'): mongoose.Model<ClimbType> => {
  return mongoose.model(name, ClimbSchema)
}
