import { Point } from '@turf/helpers'

import { DisciplineType } from '../../ClimbTypes'

export interface IFlatClimbTypes {
  typeSport: boolean
  typeTrad: boolean
  typeTR: boolean
  typeBouldering: boolean
  typeDeepWaterSolo: boolean
  typeMixed: boolean
  typeAlpine: boolean
  typeSnow: boolean
  typeIce: boolean
  typeAid: boolean
}

export const flattenDisciplines = (type: DisciplineType): IFlatClimbTypes => {
  return {
    typeSport: type?.sport ?? false,
    typeTrad: type?.trad ?? false,
    typeTR: type?.tr ?? false,
    typeBouldering: type?.bouldering ?? false,
    typeDeepWaterSolo: type?.deepwatersolo ?? false,
    typeMixed: type?.mixed ?? false,
    typeAlpine: type?.alpine ?? false,
    typeSnow: type?.snow ?? false,
    typeIce: type?.ice ?? false,
    typeAid: type?.aid ?? false
  }
}

export const disciplinesToArray = (type: DisciplineType): any => {
  const z: string[] = []
  for (const property in type) {
    if (type[property] as boolean) {
      z.push(property)
    }
  }
  return z
}

/**
 * Convert mongo db geo point type to [lat,lng] for typesense geo search
 * @param geoPoint
 * @returns
 */
export const geoToLatLng = (geoPoint: Point): [number, number] => {
  const { coordinates } = geoPoint
  return [coordinates[1], coordinates[0]]
}
