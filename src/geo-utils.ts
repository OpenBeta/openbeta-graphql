import { Point, BBox, featureCollection } from '@turf/helpers'
import bbox from '@turf/bbox'
import bboxPolygon from '@turf/bbox-polygon'
import circle from '@turf/circle'
import { LNGLAT } from './types'

/**
 * Turn a single point (crag's GPS) into a circle then create a bbox
 * @param point
 * @returns
 */
export const bboxFrom = (point: LNGLAT): BBox => {
  const options = { steps: 8 }
  const r = 0.25 // km
  const cir = circle(point, r, options)
  return bbox(cir)
}

export const bboxFromList = (bboxList: BBox[]): any => {
  const z = bboxList.map(item => bboxPolygon(item))
  return bbox(featureCollection(z))
}
