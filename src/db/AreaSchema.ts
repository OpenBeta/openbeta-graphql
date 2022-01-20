import mongoose from 'mongoose'
// import { v4 as uuidv4 } from 'uuid'
import { AreaType, IAreaContent, IAreaMetadata, AggregateType, CountByGroupType, PointType } from './AreaTypes.js'
import { ClimbSchema } from './ClimbSchema.js'

const { Schema, connection, Types } = mongoose

const MetadataSchema = new Schema<IAreaMetadata>({
  leaf: { type: Boolean, sparse: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  left_right_index: { type: Number, required: false },
  mp_id: { type: String, required: false },
  area_id: {
    type: String,
    required: true,
    unique: true
  }
}, { _id: false })

const ContentSchema = new Schema<IAreaContent>({
  description: { type: Schema.Types.String }
}, { _id: false })

export const CountByGroup = new Schema<CountByGroupType>({
  count: { type: Number, required: true },
  label: { type: String, required: true }
}, { _id: false })

export const Point = new Schema<PointType>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
}, { _id: false })
const AggregateSchema = new Schema<AggregateType>({
  byGrade: [{ type: CountByGroup, required: true }],
  byType: [{ type: CountByGroup, required: true }]
}, { _id: false })

const AreaSchema = new Schema<AreaType>({
  area_name: { type: String, required: true, index: true },
  climbs: [{ type: ClimbSchema, required: true }],
  children: [{ type: Types.ObjectId, ref: 'areas', required: true }],
  ancestors: [{ type: String, required: true }],
  aggregate: AggregateSchema,
  metadata: MetadataSchema,
  content: ContentSchema,
  parentHashRef: { type: String, required: true },
  pathHash: { type: String, required: true },
  pathTokens: [{ type: String, required: true }],
  density: { type: Number },
  totalClimbs: { type: Number },
  bounds: [{ type: Point }]
})

export const createAreaModel = (name: string): mongoose.Model<AreaType> => {
  return connection.model(name, AreaSchema)
}

export const getAreaModel = (name: string = 'areas'): mongoose.Model<AreaType> =>
  connection.model(name, AreaSchema)
