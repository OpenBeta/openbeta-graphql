import { AreaType } from './AreaTypes.js'
import { ClimbType, DisciplineType, SafetyType } from './ClimbTypes.js'
import { MUUID } from 'uuid-mongodb'
import { ExperimentalAuthorType } from './UserTypes.js'

export interface BulkImportResultType {
  addedAreas: AreaType[]
  updatedAreas: AreaType[]
  addedOrUpdatedClimbs: ClimbType[]
}

export interface BulkImportInputType {
  areas: BulkImportAreaInputType[]
}

export interface BulkImportAreaInputType {
  uuid?: MUUID
  areaName?: string
  description?: string
  countryCode?: string
  gradeContext?: string
  leftRightIndex?: number
  lng?: number
  lat?: number
  bbox?: [number, number, number, number]
  children?: BulkImportAreaInputType[]
  climbs?: BulkImportClimbInputType[]
}

export interface BulkImportClimbInputType {
  uuid?: MUUID
  name?: string
  grade: string
  disciplines: DisciplineType
  safety?: SafetyType
  lng?: number
  lat?: number
  leftRightIndex?: number
  description?: string
  location?: string
  protection?: string
  fa?: string
  length?: number
  boltsCount?: number
  experimentalAuthor?: ExperimentalAuthorType
  pitches?: BulkImportPitchesInputType[]
}

export interface BulkImportPitchesInputType {
  id?: MUUID
  pitchNumber: number
  grade: string
  disciplines?: DisciplineType
  description?: string
  length?: number
  boltsCount?: number
}
