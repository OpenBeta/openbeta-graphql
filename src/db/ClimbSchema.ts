import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { Point } from '@turf/helpers'
import { ClimbType, IClimbMetadata, IClimbContent, SafetyType } from './ClimbTypes.js'

const { Schema } = mongoose

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
  description: { type: Schema.Types.String },
  protection: { type: Schema.Types.String },
  location: { type: Schema.Types.String }
}, { _id: false })

const MetadataSchema = new Schema<IClimbMetadata>({
  lnglat: {
    type: PointSchema,
    index: '2dsphere'
  },
  left_right_index: { type: Number, required: false },
  mp_id: { type: String, required: false },
  mp_crag_id: { type: String, required: true },
  climb_id: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4(),
    required: true,
    unique: false, // unfortunately can't enforce uniqueness here due to limitation of embeded docs
    index: true
  },
  areaRef: {
    type: Schema.Types.Mixed,
    value: { type: 'Buffer' },
    required: true,
    ref: 'areas'
  }
}, { _id: false })

export const ClimbSchema = new Schema<ClimbType>({
  _id: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4()
  },
  name: { type: Schema.Types.String, required: true, index: true },
  yds: { type: Schema.Types.String, required: true },
  fa: { type: Schema.Types.String, required: false },
  type: { type: Schema.Types.Mixed },
  safety: {
    type: Schema.Types.String,
    enum: Object.values(SafetyType),
    required: true
  },
  metadata: MetadataSchema,
  content: ContentSchema
}, {
  _id: false
})

ClimbSchema.pre('validate', function (next) {
  if (this.safety as string === '') { this.safety = SafetyType.UNSPECIFIED }
  if (this.yds === '') { this.yds = 'UNKNOWN' }
  next()
})

export const getClimbModel = (name: string = 'climbs'): mongoose.Model<ClimbType> => {
  return mongoose.model(name, ClimbSchema)
}
