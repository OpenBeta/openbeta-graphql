import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

export interface MediaType {
  _id?: mongoose.Types.ObjectId
  mediaUuid: MUUID
  mediaUrl: string
  mediaType: number
  destinationId: MUUID // reference to a climb or area
  destType: number // 0: climb, 1: area
  onModel: RefModelType
}

export interface MediaTagType {
  areaName: string
  areaUuid: MUUID
  climb: any
  media: MediaType[]
}

export enum RefModelType {
  climbs = 'climbs',
  areas = 'areas'
}
