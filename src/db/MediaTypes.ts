import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'
import { Point } from '@turf/helpers'

export interface MediaType {
  _id?: mongoose.Types.ObjectId
  mediaId: string
  mediaUrl: string
  mediaType: number
  sources: SourceType[]
  lnglat?: Point
}

export interface SourceType {
  srcUuid: MUUID // reference to OpenBeta climb or area
  srcType: number // 0: climb, 1: area
}
