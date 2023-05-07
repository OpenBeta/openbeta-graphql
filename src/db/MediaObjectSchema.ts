import mongoose from 'mongoose'

import { MediaObject, EntityTag } from './MediaObjectTypes.js'
import { PointSchema } from './ClimbSchema.js'

const { Schema } = mongoose

const UUID_TYPE = {
  type: 'object', value: { type: 'Buffer' }
}

const RawTagSchema = new Schema<EntityTag>({
  targetId: { ...UUID_TYPE, index: true },
  climbName: { type: Schema.Types.String },
  areaName: { type: Schema.Types.String, required: true },
  type: { type: Schema.Types.Number, required: true },
  ancestors: { type: Schema.Types.String, required: true, index: true },
  lnglat: {
    type: PointSchema,
    index: '2dsphere'
  }
}, { _id: true })

const schema = new Schema<MediaObject>({
  userUuid: { ...UUID_TYPE, index: true },
  mediaUrl: { type: Schema.Types.String, unique: true, index: true },
  width: { type: Schema.Types.Number, required: true },
  height: { type: Schema.Types.Number, required: true },
  size: { type: Schema.Types.Number, required: true },
  format: { type: Schema.Types.String, required: true },
  entityTags: [RawTagSchema]
}, { _id: true, timestamps: true })

schema.index({ entityTags: 1 })

/**
 * Get media object model with embedded tag
 * @returns MediaObjectType
 */
export const getMediaObjectModel = (): mongoose.Model<MediaObject> => {
  return mongoose.model('media_objects', schema)
}
