import { AreaTypeSenseItem } from './TypesenseSchemas.js'
import { AreaType } from '../../AreaTypes.js'
import { geoToLatLng } from './Utils.js'

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
