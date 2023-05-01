import mongoose from 'mongoose'

import { MediaObjectType, RawTag } from './MediaMetaType.js'

const { Schema } = mongoose

const UUID_TYPE = {
  type: 'object', value: { type: 'Buffer' }
}

const RawTagSchema = new Schema<RawTag>({
  targetId: { ...UUID_TYPE, index: true },
  type: { type: Schema.Types.Number, required: true }
}, { _id: true })

const schema = new Schema<MediaObjectType>({
  userUuid: { ...UUID_TYPE, index: true },
  mediaUrl: { type: Schema.Types.String, unique: true, index: true },
  width: { type: Schema.Types.Number, required: true },
  height: { type: Schema.Types.Number, required: true },
  size: { type: Schema.Types.Number, required: true },
  format: { type: Schema.Types.String, required: true },
  birthTime: { type: Schema.Types.Date, required: true },
  mtime: { type: Schema.Types.Date, required: true },
  tags: [RawTagSchema]
}, { _id: true, timestamps: true })

/**
 * Get media object model with embedded tag
 * @returns MediaObjectType
 */
export const getMediaObjectModel = (): mongoose.Model<MediaObjectType> => {
  return mongoose.model('media_objects', schema)
}
