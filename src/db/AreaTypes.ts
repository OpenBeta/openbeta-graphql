import mongose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { BBox, Point } from '@turf/helpers'
import { ClimbType } from './ClimbTypes'
import { ChangeRecordMetadataType } from './ChangeLogType'

/**
 * The shape we expect documents to have inside the areas collection.
 *
 * mongoose.js will help us adhere to these type specifications inside
 * the areas collection.
 */
export type AreaType = IAreaProps & {
  metadata: IAreaMetadata
}

/**
 * Main properties of an Area mongodb document
 */
export interface IAreaProps {
  _id: mongose.Types.ObjectId
  /**
   * "airport style" code for areas/destinations. Area and climb names face massive duplication,
   * especially when considering international climbing. The short code gives a unique identifier
   * that is both precise, and actually share-able.
   *
   * You would never be able to keep track of the full name of an area/climb, but you could concieve
   * of recalling a shorter code for significant areas.
   */
  shortCode?: string
  /**
   * The name currently accepted as the most-used name for this area
   */
  area_name: string
  climbs: Array<MUUID | ClimbType>
  children: mongose.Types.ObjectId[]
  /**
   * CSV of all parents from this area to the root
  */
  ancestors: string
  /**
   * Array of human-readable names that correspond to the IDS enumerated
   * in the ancestors field.
  */
  pathTokens: string[]
  aggregate?: AggregateType
  content: IAreaContent
  density: number
  /** The total number of climbs in an area */
  totalClimbs: number
  _change?: ChangeRecordMetadataType
  _deleting?: Date
}

export interface IAreaMetadata {
  /**
   * Is this a climbing destination? This flags the current area as an area that
   * is unlikely to exist outside of the climbing world or as an area that has
   * unique significance to climbers in the way they discuss climbing in the area.
   * This helps to destinguish between a boulder field or valley area from something
   * more generic like a town, state, or province.
   *
   * Another example: In France there is the area "Ceuse", as in "I'm going to Ceuse".
   * Climbers will talk about Ceuse even if they have no idea what 'department' it is in
   * (In France, they have departments). The area is known of by climbers, and by the general
   * public, but climbers will refer to the area **Uniquely for its climbing**
   */
  isDestination: boolean
  /**
   * Leaf designates that this climb has no child areas, and is therefore a Crag / Boulder
   * or some other kind of physical real world climb-able entity
   * */
  leaf: boolean
  lnglat: Point
  bbox: BBox
  left_right_index: number
  /**
   * If this document was source into the database from an external source
   * (Mountain project, for example) this is the origin ID
   */
  ext_id?: string
}
export interface IAreaContent {
  description?: string
}

/**
 * Grade opinions in this area, summed for the purpose of composing graphs or ordering
 * data according to the users wishes.
 */
export interface CountByGroupType {
  count: number
  label: string
}
export interface AggregateType {
  /**
   * Grade opinions in this area, summed for the purpose of composing graphs or ordering
   * data according to the users wishes.
   */
  byGrade: CountByGroupType[]
  byDiscipline: CountByDisciplineType
  byGradeBand: CountByGradeBandType
}

/**
 * Climb type/style is determined by this set of flags. A Climb may be
 * a top rope AND a sport route, for example. It could ADDITIONALLY be
 * an alpine route.
 */
export interface CountByDisciplineType {
  trad?: DisciplineStatsType
  sport?: DisciplineStatsType
  boulder?: DisciplineStatsType
  alpine?: DisciplineStatsType
  mixed?: DisciplineStatsType
  aid?: DisciplineStatsType
  tr?: DisciplineStatsType
}

/**
 * For each discipline type, what is the breakdown (For an arbitrary context and scope)
 */
export interface DisciplineStatsType {
  total: number
  bands: CountByGradeBandType
}

/**
 * Abstraction of grade systems into a low resolution, but easy to work
 * with set of stats.
 */
export interface CountByGradeBandType {
  beginner: number
  intermediate: number
  advance: number
  expert: number
}

/**
 * Our audit trail implementation, as is common, requires entries to delcare
 * what kind of event they are. This enumeration expresses all possible audit
 * event types that may appear in the trail.
 */
export enum OperationType {
  addCountry = 'addCountry',
  addArea = 'addArea',
  deleteArea = 'deleteArea',
  updateDestination = 'updateDestination'
}
