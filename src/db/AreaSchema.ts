import mongoose from 'mongoose'
import { AreaType, IAreaContent, IAreaMetadata, AggregateType, CountByGroupType, PointType } from './AreaTypes.js'
import { ClimbSchema } from './ClimbSchema.js'

const { Schema, connection } = mongoose

const MetadataSchema = new Schema<IAreaMetadata>({
  leaf: { type: Boolean, sparse: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  left_right_index: { type: Number, required: false },
  ext_id: { type: String, required: false, index: true },
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
  climbs: [{ type: ClimbSchema, required: false }],
  children: [{ type: Schema.Types.ObjectId, ref: 'areas', required: false }],
  ancestors: { type: String, required: true, index: true },
  pathTokens: [{ type: String, required: true, index: true }],
  aggregate: AggregateSchema,
  metadata: MetadataSchema,
  content: ContentSchema,
  density: { type: Number },
  totalClimbs: { type: Number },
  bounds: [{ type: Point }]
})

export const createAreaModel = (name: string): mongoose.Model<AreaType> => {
  return connection.model(name, AreaSchema)
}

export const getAreaModel = (name: string = 'areas'): mongoose.Model<AreaType> =>
  connection.model(name, AreaSchema)
