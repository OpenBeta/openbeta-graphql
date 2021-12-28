import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { IClimb, IClimbMetadata, IClimbContent, SafetyType } from './ClimbTypes.js'

const { Schema, connection } = mongoose

const ContentSchema = new Schema<IClimbContent>({
  description: { type: Schema.Types.String },
  protection: { type: Schema.Types.String },
  location: { type: Schema.Types.String }
})

const MetadataSchema = new Schema<IClimbMetadata>({
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  left_right_index: { type: Number, required: false },
  mp_id: { type: String, required: false },
  climb_id: { type: String, required: true, default: () => uuidv4() }
})

export const ClimbSchema = new Schema<IClimb>({
  name: { type: Schema.Types.String, required: true },
  yds: { type: Schema.Types.String, required: false },
  fa: { type: Schema.Types.String, required: false },
  type: { type: Schema.Types.Mixed },
  safety: {
    type: Schema.Types.String,
    enum: Object.values(SafetyType),
    required: true
  },
  metadata: MetadataSchema,
  content: ContentSchema
})

export const createClimbModel = (): mongoose.Model<IClimb> => {
  return connection.model('Climbs', ClimbSchema)
}
