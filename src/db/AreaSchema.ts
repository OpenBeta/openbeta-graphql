import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { AreaType, IAreaContent, IAreaMetadata } from './AreaTypes.js'
import { ClimbSchema } from './ClimbSchema.js'

const { Schema, connection, Types } = mongoose

const MetadataSchema = new Schema<IAreaMetadata>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  left_right_index: { type: Number, required: false },
  mp_id: { type: String, required: false },
  area_id: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  }
})

const ContentSchema = new Schema<IAreaContent>({
  description: { type: Schema.Types.String }
})

const AreaSchema = new Schema<AreaType>({
  area_name: { type: String, required: true },
  climbs: [{ type: ClimbSchema, required: true }],
  children: [{ type: Types.ObjectId, ref: 'areas', required: true }],
  metadata: MetadataSchema,
  content: ContentSchema,
  parentHashRef: { type: String, required: true },
  pathHash: { type: String, required: true }
})

AreaSchema.index({ area_name: 1 })

export const createAreaModel = (name: string): mongoose.Model<AreaType> => {
  return connection.model(name, AreaSchema)
}

export const getAreaModel = (name: string = 'areas'): mongoose.Model<AreaType> =>
  connection.model(name, AreaSchema)
