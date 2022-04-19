import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { Point } from '@turf/helpers'
import { ClimbType, IClimbMetadata, IClimbContent, SafetyType } from './ClimbTypes.js'

const { Schema, connection } = mongoose

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
  }
}, { _id: false })

export const ClimbSchema = new Schema<ClimbType>({
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
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 5000
  }
})

ClimbSchema.pre('validate', function (next) {
  if (this.safety === '') { this.safety = SafetyType.UNSPECIFIED }
  if (this.yds === '') { this.yds = 'UNKNOWN' }
  next()
})

export const createClimbModel = (name: string): mongoose.Model<ClimbType> => {
  return connection.model(name, ClimbSchema)
}
