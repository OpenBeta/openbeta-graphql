import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import { AreaType, IAreaContent, IAreaMetadata, AggregateType, CountByGroupType, CountByDisciplineType, CountByGradeBandType, DisciplineStatsType } from './AreaTypes.js'
import { PointSchema } from './ClimbSchema.js'

const { Schema, connection } = mongoose

const MetadataSchema = new Schema<IAreaMetadata>({
  isDestination: { type: Boolean, sparse: true },
  leaf: { type: Boolean, sparse: true },
  lnglat: {
    type: PointSchema,
    index: '2dsphere'
  },
  bbox: [{ type: Number, required: true }],
  left_right_index: { type: Number, required: false },
  ext_id: { type: String, required: false, index: true },
  area_id: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4(),
    required: true,
    unique: true,
    index: true
  }
}, { _id: false })

const ContentSchema = new Schema<IAreaContent>({
  description: { type: Schema.Types.String }
}, { _id: false })

export const CountByGroup = new Schema<CountByGroupType>({
  count: { type: Number, required: true },
  label: { type: String, required: true }
}, { _id: false })

export const CountByGradeBandSchema = new Schema<CountByGradeBandType>({
  beginner: { type: Number, required: true },
  intermediate: { type: Number, required: true },
  advance: { type: Number, required: true },
  expert: { type: Number, required: true }
}, {
  _id: false
})

export const DisciplineStatsSchema = new Schema<DisciplineStatsType>({
  total: { type: Number, required: true },
  bands: { type: CountByGradeBandSchema, required: true }
}, { _id: false })

export const CountByDisciplineSchema = new Schema<CountByDisciplineType>({
  trad: { type: DisciplineStatsSchema, required: false },
  sport: { type: DisciplineStatsSchema, required: false },
  boulder: { type: DisciplineStatsSchema, required: false },
  alpine: { type: DisciplineStatsSchema, required: false },
  mixed: { type: DisciplineStatsSchema, required: false },
  aid: { type: DisciplineStatsSchema, required: false },
  tr: { type: DisciplineStatsSchema, required: false }
}, { _id: false })

const AggregateSchema = new Schema<AggregateType>({
  byGrade: [{ type: CountByGroup, required: true }],
  byDiscipline: CountByDisciplineSchema,
  byGradeBand: CountByGradeBandSchema
}, { _id: false })

export const AreaSchema = new Schema<AreaType>({
  area_name: { type: String, required: true, index: true },
  climbs: [{
    type: Schema.Types.Mixed,
    ref: 'climbs',
    required: false
  }],
  children: [{ type: Schema.Types.ObjectId, ref: 'areas', required: false }],
  ancestors: { type: String, required: true, index: true },
  pathTokens: [{ type: String, required: true, index: true }],
  aggregate: AggregateSchema,
  metadata: MetadataSchema,
  content: ContentSchema,
  density: { type: Number },
  totalClimbs: { type: Number },
  _deleting: { type: Date }
}, {
  timestamps: true
})

AreaSchema.index({ _deleting: 1 }, { expireAfterSeconds: 0 })

export const createAreaModel = (name: string = 'areas'): mongoose.Model<AreaType> => {
  return connection.model(name, AreaSchema)
}

export const getAreaModel = (name: string = 'areas'): mongoose.Model<AreaType> =>
  connection.model(name, AreaSchema)
