import mongoose from 'mongoose'
import { TickType } from './TickTypes'

const { Schema } = mongoose

/**
 * Tick Schema
 *
 * The tick schema defines how ticks are stored and serialized in the mongo database.
 * see the TickTypes.ts file for the typescript interface that defines types as they
 * are used within the application. Getting documents from this schema should kick out
 * TickType objects.
 */
export const TickSchema = new Schema<TickType>({
  _id: { type: Schema.Types.ObjectId, required: true, default: () => new mongoose.Types.ObjectId() },
  // We set immutable to true so that the dateCreated field cannot be changed
  dateCreated: { type: Date, default: () => new Date(), required: true, immutable: true },

  userId: {
    type: Schema.Types.String,
    required: true,
    index: true,
    // Prevent users from disowning their ticks.
    immutable: true
  },

  name: { type: Schema.Types.String, required: true, index: true },
  climbId: { type: Schema.Types.String, required: true, index: true },
  dateClimbed: { type: Schema.Types.String, required: true },
  grade: { type: Schema.Types.String, required: true, index: true },
  source: { type: Schema.Types.String, enum: ['MP', 'OB'], required: true, index: true },

  // Optional fields that may be unset for a given document
  style: { type: Schema.Types.String, required: false },
  notes: { type: Schema.Types.String, required: false },
  dateUpdated: { type: Date, required: false },
  attemptType: { type: Schema.Types.String, required: false, index: true }
})

TickSchema.index({ climbId: 1, dateClimbed: 1, style: 1, userId: 1, source: 1 }, { unique: true })

export const getTickModel = (name: string = 'ticks'): mongoose.Model<TickType> => {
  return mongoose.model(name, TickSchema)
}
