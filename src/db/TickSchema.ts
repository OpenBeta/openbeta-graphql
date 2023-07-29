import mongoose from 'mongoose'
import { TickSource, TickType } from './TickTypes'

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
  name: { type: Schema.Types.String, required: true, index: true },
  notes: { type: Schema.Types.String, required: false },
  climbId: { type: Schema.Types.String, required: true, index: true },
  userId: { type: Schema.Types.String, required: true, index: true },
  style: { type: Schema.Types.String, required: true, default: '' },
  attemptType: { type: Schema.Types.String, required: true, index: true, default: '' },
  dateClimbed: { type: Schema.Types.Date },
  grade: { type: Schema.Types.String, required: true, index: true },
  // Bear in mind that these enum types must be kept in sync with the TickSource enum
  source: { type: Schema.Types.String, enum: ['MP', 'OB'] as TickSource[], required: true, index: true }
})

TickSchema.index({ userId: 1 }) // for ticksByUser()
TickSchema.index({ userId: 1, climbId: 1 }) // for ticksByUserIdAndClimb()

export const getTickModel = (name: string = 'ticks'): mongoose.Model<TickType> => {
  return mongoose.model(name, TickSchema)
}
