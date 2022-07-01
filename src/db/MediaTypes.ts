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

export enum RefModelType {
  climbs = 'climbs',
  areas = 'areas'
}

export interface MediaListByAuthorType {
  _id: string
  tagList: MediaType[]
}
