import mongoose from 'mongoose'

import { MediaObjectType } from './MediaMetaType.js'

const { Schema } = mongoose

const schema = new Schema<MediaObjectType>({
  mediaUrl: { type: Schema.Types.String, unique: true },
  width: { type: Schema.Types.Number, required: true },
  height: { type: Schema.Types.Number, required: true },
  size: { type: Schema.Types.Number, required: true },
  format: { type: Schema.Types.String, required: true },
  birthTime: { type: Schema.Types.Date, required: true },
  mtime: { type: Schema.Types.Date, required: true }
}, { _id: true, timestamps: true })

export const getMediaObjectModel = (): mongoose.Model<MediaObjectType> => {
  return mongoose.model('media_objects', schema)
}
