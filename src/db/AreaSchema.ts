import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import { AreaType, IAreaContent, IAreaMetadata, AggregateType, CountByGroupType, CountByDisciplineType, CountByGradeBandType, DisciplineStatsType, OperationType, AreaEmbeddedRelations } from './AreaTypes.js'
import { PointSchema } from './ClimbSchema.js'
import { ChangeRecordMetadataType } from './ChangeLogType.js'
import { GradeContexts } from '../GradeUtils.js'

const { Schema, connection } = mongoose

const polygonSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Polygon'],
    required: true
  },
  coordinates: {
    type: [[[Number]]], // Array of arrays of arrays of numbers
    required: true
  }
}, {
  _id: false
})

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
    enum: Object.values(OperationType),
    required: true
  },
  seq: { type: Number, required: true, default: 0 }
}, { _id: false, timestamps: false })

const MetadataSchema = new Schema<IAreaMetadata>({
  isDestination: { type: Boolean, sparse: true },
  leaf: { type: Boolean, sparse: true },
  isBoulder: { type: Boolean, default: false },
  lnglat: {
    type: PointSchema,
    index: '2dsphere',
    required: false
  },
  polygon: polygonSchema,
  bbox: [{ type: Number, required: false }],
  leftRightIndex: { type: Number, required: false },
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
  description: { type: Schema.Types.String },
  areaLocation: { type: Schema.Types.String }
}, { _id: false })

export const CountByGroup = new Schema<CountByGroupType>({
  count: { type: Number, required: true },
  label: { type: String, required: true }
}, { _id: false })

export const CountByGradeBandSchema = new Schema<CountByGradeBandType>({
  unknown: { type: Number, required: true },
  beginner: { type: Number, required: true },
  intermediate: { type: Number, required: true },
  advanced: { type: Number, required: true },
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
  bouldering: { type: DisciplineStatsSchema, required: false },
  deepwatersolo: { type: DisciplineStatsSchema, required: false },
  alpine: { type: DisciplineStatsSchema, required: false },
  snow: { type: DisciplineStatsSchema, required: false },
  ice: { type: DisciplineStatsSchema, required: false },
  mixed: { type: DisciplineStatsSchema, required: false },
  aid: { type: DisciplineStatsSchema, required: false },
  tr: { type: DisciplineStatsSchema, required: false }
}, { _id: false })

const AggregateSchema = new Schema<AggregateType>({
  byGrade: [{ type: CountByGroup, required: true }],
  byDiscipline: CountByDisciplineSchema,
  byGradeBand: CountByGradeBandSchema
}, { _id: false })

const AreaEmbeddedRelationsAncestor = new Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    required: true,
    index: true,
    ref: 'areas'
  },
  name: { type: String, required: true, index: true },
  uuid: {
    type: 'object',
    value: { type: 'Buffer' },
    required: true,
    index: true
  }
}, { _id: false })

export const AreaEmbeddedRelationsSchema = new Schema<AreaEmbeddedRelations>({
  /**
   * All child area documents that are contained within this area.
   * This has a strong relation to the areas collection, and contains only direct
   * child areas - rather than all descendents.
   *
   * computed from the remote documents parent field
   */
  children: [{
    type: Schema.Types.ObjectId,
    ref: 'areas',
    index: true
  }],

  /**
   * ancestors ids of this areas parents, traversing up the heirarchy to the root area.
   * computed from the remote documents <parent> field
   */
  ancestors: [{ type: AreaEmbeddedRelationsAncestor, required: true }]
}, { _id: false })

export const AreaSchema = new Schema<AreaType>({
  area_name: { type: String, required: true, index: true },
  shortCode: { type: String, required: false, index: true },
  climbs: [{
    type: Schema.Types.Mixed,
    ref: 'climbs',
    required: false
  }],
  parent: {
    type: mongoose.Types.ObjectId,
    ref: 'areas',
    index: true,
    validate: async function () {}
  },
  embeddedRelations: AreaEmbeddedRelationsSchema,
  gradeContext: { type: String, enum: Object.values(GradeContexts), required: true },
  aggregate: AggregateSchema,
  metadata: MetadataSchema,
  content: ContentSchema,
  density: { type: Number },
  totalClimbs: { type: Number },
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

AreaSchema.index({ _deleting: 1 }, { expireAfterSeconds: 0 })
AreaSchema.index({
  'metadata.leftRightIndex': 1
}, {
  name: 'leftRightIndex',
  partialFilterExpression: {
    'metadata.leftRightIndex': {
      $gt: -1
    }
  }
})

AreaSchema.index({
  children: 1
})

connection.model('embeddedRelations', AreaEmbeddedRelationsSchema)

export const getAreaModel = (name: string = 'areas'): mongoose.Model<AreaType> =>
  connection.model(name, AreaSchema)
