import { feature, featureCollection } from '@turf/helpers'
import bbox from '@turf/bbox'
import bboxPolygon from '@turf/bbox-polygon'
import area from '@turf/area'
import circle from '@turf/circle'
import { LNGLAT, BBoxType } from './types'

/**
 * Turn a single point (crag's GPS) into a circle then create a bbox.
 * @param point
 * @returns
 */
export const bboxFrom = (point: LNGLAT): BBoxType => {
  const options = { steps: 8 }
  const r = 0.25 // unit=km. Hopefully this is a large enough area (but not too large) for a crag
  const cir = circle(point, r, options)
  return bbox(cir)
}

/**
 * Create a new bounding box from a list of smaller ones
 * @param bboxList array of BBox
 * @returns BBox
 */
export const bboxFromList = (bboxList: BBoxType[]): any => {
  const z = bboxList.map(item => bboxPolygon(item))
  return bbox(featureCollection(z))
}

/**
 * Calculate climb density
 * @param bbox
 * @param totalClimbs
 * @returns total climbs per km sq
 */
export const getAreaDensity = (bbox: BBoxType, totalClimbs: number): number => {
  const areaInKm = area(feature(bboxPolygon(bbox))) / 1000000
  const minArea = areaInKm < 5 ? 5 : areaInKm
  return totalClimbs / minArea
}
