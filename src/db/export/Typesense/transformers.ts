import { AreaTypeSenseItem, ClimbTypeSenseItem } from './TypesenseSchemas'
import { AreaType } from '../../AreaTypes'
import { disciplinesToArray, geoToLatLng } from './Utils'
import { ClimbExtType, SafetyType } from '../../ClimbTypes'

/**
 * Convert an Area object to a Typesense object
 * @param doc AreaType
 */

export function mongoAreaToTypeSense (doc: AreaType): AreaTypeSenseItem {
  return {
    id: doc.metadata.area_id.toUUID().toString(),
    areaUUID: doc.metadata.area_id.toUUID().toString(),
    name: doc.area_name ?? '',
    pathTokens: doc.pathTokens,
    areaLatLng: geoToLatLng(doc.metadata.lnglat),
    leaf: doc.metadata.leaf,
    isDestination: doc.metadata.isDestination,
    totalClimbs: doc.totalClimbs,
    density: doc.density
  }
}

/**
 * Convert a Climb object to a Typesense object
 * @param doc Climb type
 */
export function mongoClimbToTypeSense (doc: ClimbExtType): ClimbTypeSenseItem {
  return {
    climbUUID: doc._id.toUUID().toString(),
    climbName: doc.name,
    climbDesc: doc.content?.description ?? '',
    fa: doc.fa ?? '',
    areaNames: doc.pathTokens,
    disciplines: disciplinesToArray(doc.type),
    grade: doc?.yds ?? '',
    safety: doc?.safety ?? SafetyType.UNSPECIFIED.toString(),
    cragLatLng: geoToLatLng(doc.metadata.lnglat)
  }
}
