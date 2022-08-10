import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { TickType } from './TickTypes'

const { Schema } = mongoose

export const TickSchema = new Schema<TickType>({
    name: { type: Schema.Types.String, required: true, index: true },
    notes: { type: Schema.Types.String, required: false },
    uuid: { type: Schema.Types.String, required: true, index: true },
    style: { type: Schema.Types.String, required: true },
    attemptType: { type: Schema.Types.String, required: true, index: true },
    dateClimbed: { type: Schema.Types.String, required: true },
    grade: { type: Schema.Types.String, required: true, index: true },
})

export const getTickModel = (name: string = 'ticks'): mongoose.Model<TickType> => {
    return mongoose.model(name, TickSchema)
}