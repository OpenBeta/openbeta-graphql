import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'
import { Point } from '@turf/helpers'

export interface MediaType {
  _id?: mongoose.Types.ObjectId
  mediaUuid: MUUID
  mediaUrl: string
  mediaType: number
  lnglat?: Point
  srcUuid: MUUID // reference to OpenBeta climb or area
  srcType: number // 0: climb, 1: area
}

export interface MediaTagType {
  areaName: string
  areaUuid: MUUID
  climb: any
  media: MediaType[]
}
