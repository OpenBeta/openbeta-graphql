import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { BBox, Point } from '@turf/helpers'
import { ClimbType } from './ClimbTypes.js'
import { ChangeRecordMetadataType } from './ChangeLogType.js'
import { GradeContexts } from '../GradeUtils.js'

/**
 * Areas are a grouping mechanism in the OpenBeta data model that allow
 * the organization of climbs into geospatial and hierarchical structures.
 * Climbs are generally sorted by locals based on a set of area and sub-area
 * structures. Beyond that, tourists are looking for climbs based on larger
 * spaces not named and integrated by the climbing community. 'District', 'Region',
 * 'City' would all be examples of this.
 *
 * In the OpenBeta data model, we treat 'Boulders' and 'Crags' as areas - albeit
 * with distinct rules for how they are used
 * (see leaf nodes https://docs.openbeta.io/how-to-contribute/contributing-data/areas)
 *
 * [more about area concepts](https://docs.openbeta.io/how-to-contribute/contributing-data/areas)
 * */
export type AreaType = IAreaProps & {
  metadata: IAreaMetadata
}

/**
 * Properties that areas are expected to have.
 * Objects of this kind may not be reified in the database and, if they are,
 * they may be hard to locate based on the contents of this object.
 * See AreaType for the reified version of this object, and always use it
 * if you are working with data that exists inside the database.
*/
export interface IAreaProps {
  _id: mongoose.Types.ObjectId
  /**
   * ShortCodes are short, globally uniqe codes that identify significant climbing areas
   **/
  shortCode?: string
  /**
   * What name is considered most popular for this area?
   * Areas occasionally have multiple valid names, but this one is the one
   * that might be considered as the 'most popular'.
   *
   * It's not a great idea to identify by this field, as area names are not
   * unique and are subject to change.
   **/
  area_name: string
  /**
   * The climbs that appear within this area (Only applies for leaf nodes).
   * Only areas that are permitted direct climb children will have these, and these
   * are conventionally not allowed to have area children.
   */
  climbs: Array<MUUID | ClimbType>
  /**
   * All child area documents that are contained within this area.
   * This has a strong relation to the areas collection, and contains only direct
   * child areas - rather than all descendents.
   */
  children: mongoose.Types.ObjectId[]
  /**
   * areaNames of this areas parents, traversing up the heirarchy to the root area.
   * This is encoded as a string, but is really an array delimited by comma.
   */
  ancestors: string
  /** UUIDs of this areas parents, traversing up the heirarchy to the root area. */
  pathTokens: string[]

  gradeContext: GradeContexts
  /**
   * computed aggregations on this document. See the AggregateType documentation for
   * more information.
  */
  aggregate?: AggregateType
  /**
   * User-composed content that makes up most of the user-readable data in the system.
   * See the IAreaContent documentation for more information.
   **/
  content: IAreaContent
  /**
   * how many climbs are in this area per square kilometer.
   * This field is re-computed on its own schedule, but is not guaranteed to
   * be accurate for a given system state. It depends on the size of the area,
   * and the implementation of the update system in play.
   * */
  density: number
  /**
   * The total number of climbs in this area, regardless of hierarchy depth.
   * Meaning that for a country, even though the document may not contain any
   * direct children
   * */
  /** The total number of climbs in this area. */
  totalClimbs: number
  /**
   * If this area has been edited, this field will contain the metadata about the
   * last edit that was made.
   */
  _change?: ChangeRecordMetadataType
  /** Used to delete an area.  See https://www.mongodb.com/docs/manual/core/index-ttl/ */
  _deleting?: Date
  createdAt?: Date
  updatedAt?: Date
  updatedBy?: MUUID
  createdBy?: MUUID
}

export interface IAreaMetadata {
  isDestination: boolean
  /**
   * Leaf areas may have climbs as children, but may not have other areas as children.
   **/
  leaf: boolean
  /**
   * Some contributions will create areas that may not immediately have any climbs,
   * but are nevertheless intended as leaf nodes that should contain primarily bouldering
   * climbs, but definitely ONLY climbs.
   *
   * If not set, but the area is a leaf node, we expect that the area may be a crag(cliff)
   * and will contain largely sport and trad climbs.
   */
  isBoulder?: boolean
  /**
   * Areas may be very large, and this point may represent the centroid of the area's bounds
   * or a spec point chosen by users.
   * */
  lnglat: Point
  /**
   * The smallest possible bounding box (northwest and southeast coordinates) that contains
   * all of this areas children (Both sub-areas and climbs).
   */
  bbox: BBox
  left_right_index: number
  /**
   * Some areas have been directly imported into the OpenBeta dataset, and if they have
   * this field will record their external relation.
   * */
  ext_id?: string
  /**
   * All external IDs for areas are expressed as UUIDs. As such, when resolving ids at the
   * GQL layer use these values for querying and identification of areas.
   */
  area_id: MUUID
}
export interface IAreaContent {
  /** longform to mediumform description of this area.
   * Remembering that areas can be the size of countries, or as precise as a single cliff/boulder,
   * there is not a single definition of valid content for this field.
   *
   * We expect users to make a call about whatever kind of context may be appropriate for this
   * entity, and may be pretty short to extremely detailed.
   */
  description?: string
}

/** Fields that may be directly modified by users
 * This does not define the total set of mutable fields in the area, only the ones that users
 * may directly submit and over-write
 */
export interface AreaEditableFieldsType {
  areaName?: string
  description?: string
  isDestination?: boolean
  isLeaf?: boolean
  isBoulder?: boolean
  shortCode?: string
  lat?: number
  lng?: number
}

export interface CountByGroupType {
  count: number
  label: string
}
export interface AggregateType {
  byGrade: CountByGroupType[]
  byDiscipline: CountByDisciplineType
  byGradeBand: CountByGradeBandType
}
export interface CountByDisciplineType {
  trad?: DisciplineStatsType
  sport?: DisciplineStatsType
  bouldering?: DisciplineStatsType
  alpine?: DisciplineStatsType
  snow?: DisciplineStatsType
  ice?: DisciplineStatsType
  mixed?: DisciplineStatsType
  aid?: DisciplineStatsType
  tr?: DisciplineStatsType
}

export interface DisciplineStatsType {
  total: number
  bands: CountByGradeBandType
}

/** Aggreation type counting grade bands, which are a meta grading system */
export interface CountByGradeBandType {
  unknown: number
  beginner: number
  intermediate: number
  advanced: number
  expert: number
}

/** The audit trail comprises a set of controlled events that may occur in relation
 * to user actiion on core data. The enumeration herein defines the set of events
 * that may occur, and short documentation of what they mean
 */
export enum OperationType {
  /** The addition of countries is a pretty big deal, as we expect most countries to
   * already be added - and this event is only expected to occur once per country.
   */
  addCountry = 'addCountry',
  /** Signal meaning that an area has been created in the areas collection */
  addArea = 'addArea',
  /**
   * This event signals that an area should be deleted. These signals can be reversed,
   * areas being capable of un-deletion.
   */
  deleteArea = 'deleteArea',
  /** see metadata.isDestination for more information, this signals a change in this
   * specific field's boolean state.
   */
  updateDestination = 'updateDestination',
  /** signals that a user has pushed new user-changable data has been pushed into an area document. */
  updateArea = 'updateArea'
}
