import { MUUID } from 'uuid-mongodb'
import { Point } from '@turf/helpers'
import { AreaType } from '../db/AreaTypes'
import { ClimbType } from '../db/ClimbTypes'

export const muuidToString = (m: MUUID): string => m.toUUID().toString()

/**
 * Ensures that type-checking errors out if enums are not
 * handled exhaustively in switch statements.
 * Eg.
 * switch(val) {
 *   case enumOne:
 *   ...
 *   default:
 *     exhaustiveCheck(val)
 * }
 * @param _value
 */
export function exhaustiveCheck (_value: never): never {
  throw new Error(`ERROR! Enum not handled for ${JSON.stringify(_value)}`)
}

export const geojsonPointToLongitude = (point: Point): number => point.coordinates[0]
export const geojsonPointToLatitude = (point: Point): number => point.coordinates[1]

export function compareAreaLeftRightIndex (a: AreaType, b: AreaType): number {
  if (a.metadata.leftRightIndex == null || b.metadata.leftRightIndex == null) {
    return 0 // Preserve order if any element is missing leftRightIndex
  }
  return (a.metadata.leftRightIndex - b.metadata.leftRightIndex)
}

export function compareClimbLeftRightIndex (a: ClimbType, b: ClimbType): number {
  if (a.metadata.left_right_index == null || b.metadata.left_right_index == null) {
    return 0 // Preserve order if any element is missing left_right_index
  }
  return (a.metadata.left_right_index - b.metadata.left_right_index)
}
