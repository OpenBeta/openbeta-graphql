import { MUUID } from "uuid-mongodb"

export interface TickType {
    _id: MUUID
    name: string
    notes: string
    uuid: string
    user: string
    style: string
    attemptType: string
    dateClimbed: string
    grade: string
}