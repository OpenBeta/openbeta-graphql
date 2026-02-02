import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { PartiallyResolvedArea } from '../../resolvers/area';
import { ClimbPrimitive } from '../../beta/repo/climb';
import { MediaRecord } from '../../beta/repo/media';
import { Context } from '../../server/context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: any; output: any; }
  JSONObject: { input: any; output: any; }
  UUID: { input: any; output: any; }
};

export type AddOrganizationInput = {
  associatedAreaIds?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
  description?: InputMaybe<Scalars['String']['input']>;
  displayName: Scalars['String']['input'];
  donationLink?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  excludedAreaIds?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
  facebookLink?: InputMaybe<Scalars['String']['input']>;
  hardwareReportLink?: InputMaybe<Scalars['String']['input']>;
  instagramLink?: InputMaybe<Scalars['String']['input']>;
  orgType: Scalars['String']['input'];
  website?: InputMaybe<Scalars['String']['input']>;
};

/** Input for adding a new tag input. */
export type AddTagInput = {
  destinationId: Scalars['ID']['input'];
  destinationType: Scalars['Int']['input'];
  mediaUrl: Scalars['String']['input'];
  mediaUuid: Scalars['ID']['input'];
};

export type AddTagResponse = {
  __typename?: 'AddTagResponse';
  tagId?: Maybe<Scalars['ID']['output']>;
};

/** Aggregations of data about this area, its children and its climbs. */
export type AggregateType = {
  __typename?: 'AggregateType';
  /** Sums of climbs grouped by discipline */
  byDiscipline?: Maybe<CountByDisciplineType>;
  /** Sums of climbs grouped by arbitrary grade */
  byGrade?: Maybe<Array<Maybe<CountByGroupType>>>;
  /** Sums of climbs grouped by grade band (Rough adjective difficulty) */
  byGradeBand?: Maybe<CountByGradeBand>;
};

export type AllHistoryFilter = {
  fromDate?: InputMaybe<Scalars['Date']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  toDate?: InputMaybe<Scalars['Date']['input']>;
  userUuid?: InputMaybe<Scalars['ID']['input']>;
  uuidList?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
};

export type AllTimeTags = {
  __typename?: 'AllTimeTags';
  byUsers: Array<Maybe<TagsByUser>>;
  totalMediaWithTags: Scalars['Int']['output'];
};

export type AreEditableFieldsInput = {
  areaLocation?: InputMaybe<Scalars['String']['input']>;
  areaName?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  experimentalAuthor?: InputMaybe<ExperimentalAuthorType>;
  isBoulder?: InputMaybe<Scalars['Boolean']['input']>;
  isDestination?: InputMaybe<Scalars['Boolean']['input']>;
  isLeaf?: InputMaybe<Scalars['Boolean']['input']>;
  lat?: InputMaybe<Scalars['Float']['input']>;
  leftRightIndex?: InputMaybe<Scalars['Int']['input']>;
  lng?: InputMaybe<Scalars['Float']['input']>;
  shortCode?: InputMaybe<Scalars['String']['input']>;
  uuid: Scalars['String']['input'];
};

/** A climbing area, wall or crag */
export type Area = {
  __typename?: 'Area';
  /** statistics about this area */
  aggregate?: Maybe<AggregateType>;
  /** UUIDs of this areas parents, traversing up the heirarchy to the root area. */
  ancestors: Array<Maybe<Scalars['String']['output']>>;
  areaName: Scalars['String']['output'];
  /** The name that this area is commonly identified by */
  area_name: Scalars['String']['output'];
  /** Metadata about creation & update of this area */
  authorMetadata: AuthorMetadata;
  /**
   * The areas that appear within this area. If this area is a leaf node,
   * you will not expect to see any child areas.
   */
  children?: Maybe<Array<Maybe<Area>>>;
  /**
   * The climbs that appear within this area. If this area is a leaf node, then these climbs can be understood
   * as appearing physically on - rather than within - this area.
   */
  climbs?: Maybe<Array<Maybe<Climb>>>;
  content?: Maybe<AreaContent>;
  /** total climbs per km sq */
  density: Scalars['Float']['output'];
  /**
   * Grade systems have minor variations between countries.
   * gradeContext is a short abbreviated string that identifies the
   * context in which the grade was assigned.
   *
   * Area grade contexts will be inherited by its nearest child climbs.
   */
  gradeContext: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /**
   * If you were to sum all approximate image sizes for this area, you get
   * a kind of picture of what the cost to cache all of the media in a given
   * area might be. You could use this to indicate a recommended compression
   * ratio or maybe know ahead of time if a given cache exercise would exceed
   * current storage capacity.
   */
  imageByteSum: Scalars['Int']['output'];
  /** Media associated with this area, or its child climbs */
  media?: Maybe<Array<Maybe<MediaWithTags>>>;
  /** Paginated media for this area */
  mediaPagination?: Maybe<AreaMedia>;
  metadata: AreaMetadata;
  /** Organizations associated with this area or its parent areas */
  organizations?: Maybe<Array<Maybe<Organization>>>;
  /** pathTokens hashed into a single string */
  pathHash?: Maybe<Scalars['String']['output']>;
  /** areaNames of this areas parents, traversing up the heirarchy to the root area. */
  pathTokens: Array<Maybe<Scalars['String']['output']>>;
  /** ShortCodes are short, globally uniqe codes that identify significant climbing areas */
  shortCode?: Maybe<Scalars['String']['output']>;
  /** The total number of climbs in this area */
  totalClimbs: Scalars['Int']['output'];
  /** We use UUID for identification of areas. The id field is used in internal database relations. */
  uuid: Scalars['ID']['output'];
};


/** A climbing area, wall or crag */
export type AreaMediaPaginationArgs = {
  input?: InputMaybe<EmbeddedAreaMediaInput>;
};

export type AreaContent = {
  __typename?: 'AreaContent';
  areaLocation?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
};

export type AreaFilter = {
  exactMatch?: InputMaybe<Scalars['Boolean']['input']>;
  match: Scalars['String']['input'];
};

export type AreaHistoryFilter = {
  areaId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type AreaInput = {
  countryCode?: InputMaybe<Scalars['String']['input']>;
  experimentalAuthor?: InputMaybe<ExperimentalAuthorType>;
  isBoulder?: InputMaybe<Scalars['Boolean']['input']>;
  isDestination?: InputMaybe<Scalars['Boolean']['input']>;
  isLeaf?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  parentUuid?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * Area media cursor with pagination support.
 * See https://graphql.org/learn/pagination/
 */
export type AreaMedia = {
  __typename?: 'AreaMedia';
  areaUuid: Scalars['ID']['output'];
  mediaConnection: MediaConnection;
};

/** Input parameters for area and climb media queries. */
export type AreaMediaInput = {
  /** Returning page data after this cursor (exclusive).  Return the first page if omitted. */
  after?: InputMaybe<Scalars['ID']['input']>;
  /** Area UUID   Ex: 5f5b4b4b-0b3b-4b3b-8b3b-7b3b2b3b2b3b */
  areaUuid: Scalars['ID']['input'];
  /** Number of objects per page (Default = 6). */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Max number of objects return.  Ignore when using with pagination query. */
  maxFiles?: InputMaybe<Scalars['Int']['input']>;
};

export type AreaMetadata = {
  __typename?: 'AreaMetadata';
  areaId: Scalars['ID']['output'];
  area_id: Scalars['ID']['output'];
  /** NE and SW corners of the bounding box for this area */
  bbox?: Maybe<Array<Maybe<Scalars['Float']['output']>>>;
  /** If this is true, this area is a bouldering area or an individual boulder. */
  isBoulder?: Maybe<Scalars['Boolean']['output']>;
  isDestination: Scalars['Boolean']['output'];
  /** centroid latitude of this areas bounding box */
  lat?: Maybe<Scalars['Float']['output']>;
  /**
   * If this is true, this area has no children and is a leaf node.
   * This means that the area is a crag, boulder or wall that has
   * climbs as its direct decendents.
   * If both leaf and isBoulder are true:
   *   - This area is a boulder.
   *   - climbs[] may only contain boulder problems.
   */
  leaf: Scalars['Boolean']['output'];
  /** Left-to-right sorting index.  Undefined or -1 or unsorted area. */
  leftRightIndex?: Maybe<Scalars['Int']['output']>;
  /** centroid longitude of this areas bounding box */
  lng?: Maybe<Scalars['Float']['output']>;
  /** Mountainproject ID (if associated) */
  mp_id: Scalars['String']['output'];
  /** Array of the polygon vertices (convex hull) containing child areas. */
  polygon?: Maybe<Array<Maybe<Array<Maybe<Scalars['Float']['output']>>>>>;
};

/** Area sorting input param */
export type AreaSortingInput = {
  /** Area UUID */
  areaId: Scalars['String']['input'];
  /** Left-to-right sorting index. The backend enforces uniqueness for value >= 0.  Use -1 to indicate unsorted order. */
  leftRightIndex: Scalars['Int']['input'];
};

/** Filter for organizations that are associated with an area. */
export type AssociatedAreaIdsFilter = {
  includes?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};

/** Author metadata */
export type AuthorMetadata = {
  __typename?: 'AuthorMetadata';
  createdAt?: Maybe<Scalars['Date']['output']>;
  createdBy?: Maybe<Scalars['ID']['output']>;
  createdByUser?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['Date']['output']>;
  updatedBy?: Maybe<Scalars['ID']['output']>;
  updatedByUser?: Maybe<Scalars['String']['output']>;
};

/**
 * Bulk input for adding or updating areas.
 * Provide either a `uuid` to UPDATE an existing area, or `areaName` to ADD a new area.
 */
export type BulkImportAreaInput = {
  /** The name of the new area (or, if provided together with a uuid, the updated name of the area) */
  areaName?: InputMaybe<Scalars['String']['input']>;
  /** An optional bounding box that can be displayed on maps, using GeoJSON bbox (see https://datatracker.ietf.org/doc/html/rfc7946#section-5). */
  bbox?: InputMaybe<Array<InputMaybe<Scalars['Float']['input']>>>;
  /** A list of child areas. Can be deeply nested. */
  children?: InputMaybe<Array<InputMaybe<BulkImportAreaInput>>>;
  /**
   * A list of climbs that are directly associated with this area.
   * An area that has climbs cannot have child areas and automatically becomes a leaf node.
   */
  climbs?: InputMaybe<Array<InputMaybe<BulkImportClimbInput>>>;
  /** Only relevant for the first level of areas (i. e. USA -> Utah). Must be ISO 3166-1 Alpha-3 country code (e. g. ‘USA’). */
  countryCode?: InputMaybe<Scalars['String']['input']>;
  /** The name that this area is commonly identified by within the climbing community. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The grading system used for climbing/bouldering in the area. Inherits from parent node if current node does not have one. UIAA = UIAA/font, US = yds/vscale, FR = french/font (see https://github.com/OpenBeta/openbeta-graphql/blob/9c517329db079c922fe7f092a78b658cb295e158/src/GradeUtils.ts#L40.) */
  gradeContext?: InputMaybe<Scalars['String']['input']>;
  /** Latitude coordinate of the area, using the WGS 84 reference system. */
  lat?: InputMaybe<Scalars['Float']['input']>;
  /** The sorting index of the area. Defaults to -1 if not provided. */
  leftRightIndex?: InputMaybe<Scalars['Int']['input']>;
  /** Longitude coordinate of the area, using the WGS 84 reference system. */
  lng?: InputMaybe<Scalars['Float']['input']>;
  /** The area UUID */
  uuid?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * Bulk input for adding or updating climbs (and pitches) within an area.
 * Either define `uuid` or `name` to indicate whether to add or update a climb.
 * Provide a `uuid` to UPDATE a climb, and `name` to ADD a new climb.
 * Make sure to update all climbs if the leftRightIndex of a climb is updated.
 */
export type BulkImportClimbInput = {
  /** The number of bolts (fixed anchors) on the climb. */
  boltsCount?: InputMaybe<Scalars['Int']['input']>;
  /** The description of this climb, this is the main text field for this climb. This contains beta, visual descriptors, and any other information useful to identifying and attempting the climb. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Object of applicable disciplines (e.g. { "trad": true }). Options: trad, sport, bouldering, deepwatersolo, alpine, ice, mixed, aid, tr (= toprope). Can be combined. */
  disciplines: DisciplineType;
  /** The experimental author of the climb. */
  experimentalAuthor?: InputMaybe<ExperimentalAuthorType>;
  /** The first ascent information of the climb. Usually formatted as: name(s) (year). */
  fa?: InputMaybe<Scalars['String']['input']>;
  /** The difficulty grade of the climb. Must be coherent with the area's gradeContext. I. e. gradeContext = 'US' requires denomination in yds/vscale (climbing/bouldering), so '5.11'/'V14', 'FR' would be french/font '9c+'/'9a', 'UIIA' would be uiaa/font '9+'/'9a'. (see https://github.com/OpenBeta/sandbag). */
  grade: Scalars['String']['input'];
  /** Latitude coordinate of the climb, using the WGS 84 reference system. */
  lat?: InputMaybe<Scalars['Float']['input']>;
  /** A numeric index used for sorting climbs from left to right (of a wall). */
  leftRightIndex?: InputMaybe<Scalars['Int']['input']>;
  /** Total length in meters if known (-1 otherwise) */
  length?: InputMaybe<Scalars['Int']['input']>;
  /** Longitude coordinate of the climb, using the WGS 84 reference system. */
  lng?: InputMaybe<Scalars['Float']['input']>;
  /** The location of the climb, e.g. 'The first climb on the left, entry directly behind the tree'. */
  location?: InputMaybe<Scalars['String']['input']>;
  /** The name that this climb is commonly identified by (or if provided together with a uuid, the updated name of the climb). */
  name?: InputMaybe<Scalars['String']['input']>;
  /** A list of pitches that are directly associated with this climb (applies only to multi-pitch climbs). */
  pitches?: InputMaybe<Array<InputMaybe<BulkImportPitchesInput>>>;
  /** The protection of the climb, e.g. 'Long run out to the first bolt'. */
  protection?: InputMaybe<Scalars['String']['input']>;
  /** The safety rating of a climb based on US movie ratings (see https://github.com/OpenBeta/openbeta-graphql/blob/9c517329db079c922fe7f092a78b658cb295e158/src/graphql/schema/Climb.gql#L177). */
  safety?: InputMaybe<SafetyEnum>;
  /** The climb UUID */
  uuid?: InputMaybe<Scalars['ID']['input']>;
};

/** Bulk input for adding or updating areas, climbs, and pitches. */
export type BulkImportInput = {
  areas: Array<InputMaybe<BulkImportAreaInput>>;
};

/**
 * Bulk input for adding or updating pitches within a climb.
 * Provide `id` to UPDATE an existing pitch.
 * Make sure to update all pitches if the pitchNumber of one pitch is changed.
 */
export type BulkImportPitchesInput = {
  /** The number of bolts (fixed anchors) on the pitch. */
  boltsCount?: InputMaybe<Scalars['Int']['input']>;
  /** The description of the pitch. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The climbing disciplines applicable to the pitch (see Climb.disciplines). */
  disciplines?: InputMaybe<DisciplineType>;
  /** The difficulty grade of the pitch (see Climb.grade). */
  grade: Scalars['String']['input'];
  /** The pitch UUID (if provided, the pitch data will be UPDATED). */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** The length of the pitch in meters. */
  length?: InputMaybe<Scalars['Int']['input']>;
  /** The number of the pitch in the sequence. */
  pitchNumber: Scalars['Int']['input'];
};

export type BulkImportResult = {
  __typename?: 'BulkImportResult';
  addedAreas?: Maybe<Array<Maybe<Area>>>;
  addedOrUpdatedClimbs?: Maybe<Array<Maybe<Climb>>>;
  updatedAreas?: Maybe<Array<Maybe<Area>>>;
};

export type Change = {
  __typename?: 'Change';
  changeId: Scalars['ID']['output'];
  dbOp: Scalars['String']['output'];
  fullDocument?: Maybe<Document>;
  updateDescription?: Maybe<UpdateDescription>;
};

/** A climbing route or a boulder problem */
export type Climb = {
  __typename?: 'Climb';
  /**
   * Area UUIDs traversing up the heirarchy from this climbs immediate
   * parent to the root area.
   */
  ancestors?: Maybe<Array<Scalars['String']['output']>>;
  /** Metadata about creation & update of this climb */
  authorMetadata: AuthorMetadata;
  /** Number of bolts/permanent anchors, if known (-1 otherwise) */
  boltsCount?: Maybe<Scalars['Int']['output']>;
  /**
   * Composable attributes for this climb, these are the bread and butter
   * guidebook-like data that make up the bulk of the text beta for this climb
   */
  content: Content;
  /** First ascent, if known. Who was the first person to climb this route? */
  fa?: Maybe<Scalars['String']['output']>;
  /**
   * Grade systems have minor variations between countries.
   * gradeContext is a short abbreviated string that identifies the
   * context in which the grade was assigned.
   */
  gradeContext?: Maybe<Scalars['String']['output']>;
  /** The grade(s) assigned to this climb. See GradeType documentation */
  grades?: Maybe<GradeType>;
  id: Scalars['ID']['output'];
  /** Total length in meters if known (-1 otherwise) */
  length: Scalars['Int']['output'];
  /** Media associated with this climb */
  media?: Maybe<Array<Maybe<MediaWithTags>>>;
  /** Paginated media for this climb */
  mediaPagination?: Maybe<ClimbMedia>;
  metadata: ClimbMetadata;
  /** The name that this climb is commonly identified by */
  name: Scalars['String']['output'];
  /** The parent area object */
  parent: Area;
  /**
   * Area names traversing up the hierarchy from this climbs immediate
   * parent to the root area.
   */
  pathTokens?: Maybe<Array<Scalars['String']['output']>>;
  /** List of Pitch objects representing individual pitches of a multi-pitch climb */
  pitches?: Maybe<Array<Maybe<Pitch>>>;
  safety?: Maybe<SafetyEnum>;
  /** User ticks of this climb */
  ticks?: Maybe<Array<Maybe<TickType>>>;
  type: ClimbType;
  /**
   * The UUID of the climb is the field used for identification.
   * The id field is used in internal database relations, most GQL
   * queries will use the uuid field.
   */
  uuid: Scalars['ID']['output'];
  /** @deprecated Migrating to 'grades' field */
  yds?: Maybe<Scalars['String']['output']>;
};


/** A climbing route or a boulder problem */
export type ClimbMediaPaginationArgs = {
  input?: InputMaybe<EmbeddedClimbMediaInput>;
};

/**
 * Climb media cursor with pagination support.
 * See https://graphql.org/learn/pagination/
 */
export type ClimbMedia = {
  __typename?: 'ClimbMedia';
  climbUuid: Scalars['ID']['output'];
  mediaConnection: MediaConnection;
};

/** Input parameters for climb media queries. */
export type ClimbMediaInput = {
  /** Returning page data after this cursor (exclusive).  Return the first page if omitted. */
  after?: InputMaybe<Scalars['ID']['input']>;
  /** Climb UUID   Ex: 5f5b4b4b-0b3b-4b3b-8b3b-7b3b2b3b2b3b */
  climbUuid: Scalars['ID']['input'];
  /** Number of objects per page (Default = 6). */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Max number of objects return.  Ignore when using with pagination query. */
  maxFiles?: InputMaybe<Scalars['Int']['input']>;
};

export type ClimbMetadata = {
  __typename?: 'ClimbMetadata';
  climbId: Scalars['ID']['output'];
  climb_id: Scalars['ID']['output'];
  lat?: Maybe<Scalars['Float']['output']>;
  leftRightIndex?: Maybe<Scalars['Int']['output']>;
  left_right_index?: Maybe<Scalars['Int']['output']>;
  lng?: Maybe<Scalars['Float']['output']>;
  /** If this climb originated from Mountain Project, this is the ID */
  mp_id?: Maybe<Scalars['String']['output']>;
};

/**
 * What sort of climb is this? Routes can combine these fields, which is why
 * this is not an enumeration.
 *
 * For example, a route may be a sport route, but also a top rope route.
 */
export type ClimbType = {
  __typename?: 'ClimbType';
  /** https://en.wikipedia.org/wiki/Aid_climbing */
  aid?: Maybe<Scalars['Boolean']['output']>;
  /** https://en.wikipedia.org/wiki/Alpine_climbing */
  alpine?: Maybe<Scalars['Boolean']['output']>;
  /** https://en.wikipedia.org/wiki/Bouldering */
  bouldering?: Maybe<Scalars['Boolean']['output']>;
  /** https://en.wikipedia.org/wiki/Deep-water_soloing */
  deepwatersolo?: Maybe<Scalars['Boolean']['output']>;
  /** https://en.wikipedia.org/wiki/Ice_climbing */
  ice?: Maybe<Scalars['Boolean']['output']>;
  mixed?: Maybe<Scalars['Boolean']['output']>;
  /** https://en.wikipedia.org/wiki/Ice_climbing */
  snow?: Maybe<Scalars['Boolean']['output']>;
  /** https://en.wikipedia.org/wiki/Sport_climbing */
  sport?: Maybe<Scalars['Boolean']['output']>;
  /** https://en.wikipedia.org/wiki/Top_rope_climbing */
  tr?: Maybe<Scalars['Boolean']['output']>;
  /** https://en.wikipedia.org/wiki/Traditional_climbing */
  trad?: Maybe<Scalars['Boolean']['output']>;
};

export enum CompareType {
  Eq = 'eq',
  Gt = 'gt',
  Lt = 'lt'
}

export type ComparisonFilter = {
  comparison?: InputMaybe<CompareType>;
  field?: InputMaybe<Field>;
  num?: InputMaybe<Scalars['Float']['input']>;
};

/**
 * Composable attributes for this climb, these are the bread and butter
 * guidebook-like data that make up the bulk of the text beta for this climb
 */
export type Content = {
  __typename?: 'Content';
  /**
   * The description of this climb, this is the main text field for this climb.
   * This contains beta, visual descriptors, and any other information useful
   * to identifying and attempting the climb
   */
  description?: Maybe<Scalars['String']['output']>;
  /**
   * Information regarding Approach and other location context for this climb.
   * Could also include information about the situation of this specific climb.
   */
  location?: Maybe<Scalars['String']['output']>;
  /**
   * What do climbers need to know about making a safe attempt of this climb?
   * What gear do they need, what are the hazards, etc.
   */
  protection?: Maybe<Scalars['String']['output']>;
};

export type CountByDisciplineType = {
  __typename?: 'CountByDisciplineType';
  aid?: Maybe<DisciplineStatsType>;
  alpine?: Maybe<DisciplineStatsType>;
  /** @deprecated Migrating to 'bouldering' */
  boulder?: Maybe<DisciplineStatsType>;
  bouldering?: Maybe<DisciplineStatsType>;
  deepwatersolo?: Maybe<DisciplineStatsType>;
  ice?: Maybe<DisciplineStatsType>;
  mixed?: Maybe<DisciplineStatsType>;
  snow?: Maybe<DisciplineStatsType>;
  sport?: Maybe<DisciplineStatsType>;
  tr?: Maybe<DisciplineStatsType>;
  trad?: Maybe<DisciplineStatsType>;
};

export type CountByGradeBand = {
  __typename?: 'CountByGradeBand';
  advanced?: Maybe<Scalars['Int']['output']>;
  beginner?: Maybe<Scalars['Int']['output']>;
  expert?: Maybe<Scalars['Int']['output']>;
  intermediate?: Maybe<Scalars['Int']['output']>;
  unknown?: Maybe<Scalars['Int']['output']>;
};

export type CountByGroupType = {
  __typename?: 'CountByGroupType';
  count?: Maybe<Scalars['Int']['output']>;
  label?: Maybe<Scalars['String']['output']>;
};

export type CountryInput = {
  alpha3ISOCode?: InputMaybe<Scalars['String']['input']>;
};

export type CragsNear = {
  __typename?: 'CragsNear';
  _id: Scalars['ID']['output'];
  count: Scalars['Int']['output'];
  crags?: Maybe<Array<Maybe<Area>>>;
  placeId: Scalars['String']['output'];
};

export type DeleteAllTickResult = {
  __typename?: 'DeleteAllTickResult';
  deletedCount?: Maybe<Scalars['Int']['output']>;
  removed: Scalars['Boolean']['output'];
};

export type DeleteManyClimbsInput = {
  idList?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
  parentId?: InputMaybe<Scalars['ID']['input']>;
};

export type DeleteSingleTickResult = {
  __typename?: 'DeleteSingleTickResult';
  _id: Scalars['ID']['output'];
  removed: Scalars['Boolean']['output'];
};

export type DestinationFlagInput = {
  flag: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};

export type DisciplineStatsType = {
  __typename?: 'DisciplineStatsType';
  bands: CountByGradeBand;
  total: Scalars['Int']['output'];
};

export type DisciplineType = {
  aid?: InputMaybe<Scalars['Boolean']['input']>;
  alpine?: InputMaybe<Scalars['Boolean']['input']>;
  bouldering?: InputMaybe<Scalars['Boolean']['input']>;
  deepwatersolo?: InputMaybe<Scalars['Boolean']['input']>;
  ice?: InputMaybe<Scalars['Boolean']['input']>;
  mixed?: InputMaybe<Scalars['Boolean']['input']>;
  snow?: InputMaybe<Scalars['Boolean']['input']>;
  sport?: InputMaybe<Scalars['Boolean']['input']>;
  tr?: InputMaybe<Scalars['Boolean']['input']>;
  trad?: InputMaybe<Scalars['Boolean']['input']>;
};

export type DisplayNameFilter = {
  exactMatch?: InputMaybe<Scalars['Boolean']['input']>;
  match: Scalars['String']['input'];
};

export type Document = Area | Climb | Organization;

/**
 * This EmbeddedAreaMediaInput is different from the AreaMediaInput in Media.gql because we don't need to
 * include the areaUuid (which is required over in the paginated Media query). Here in the area query,
 * the areaUuid is already included in top level of the query
 */
export type EmbeddedAreaMediaInput = {
  /** Returning page data after this cursor (exclusive).  Return the first page if omitted. */
  after?: InputMaybe<Scalars['ID']['input']>;
  /** Number of objects per page (Default = 6). */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Max number of objects return.  Ignore when using with pagination query. */
  maxFiles?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * This EmbeddedClimbMediaInput is different from the ClimbMediaInput in Media.gql because we don't need to
 * include the climbUuid (which is required over in the paginated Media query). Here in the climb query,
 * the climbUuid is already included in top level of the query.
 */
export type EmbeddedClimbMediaInput = {
  /** Returning page data after this cursor (exclusive).  Return the first page if omitted. */
  after?: InputMaybe<Scalars['ID']['input']>;
  /** Number of objects per page (Default = 6). */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Max number of objects return.  Ignore when using with pagination query. */
  maxFiles?: InputMaybe<Scalars['Int']['input']>;
};

export type EmbeddedEntityInput = {
  /** What this tag is pointing to (a climb/area) */
  entityId: Scalars['ID']['input'];
  /** 0: climb, 1: area */
  entityType: Scalars['Int']['input'];
};

/** A tag target (an area or a climb) */
export type EntityTag = {
  __typename?: 'EntityTag';
  /** ancestors name */
  ancestors: Scalars['String']['output'];
  /** Area name */
  areaName: Scalars['String']['output'];
  /** Climb name */
  climbName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Latitude */
  lat: Scalars['Float']['output'];
  /** Longitude */
  lng: Scalars['Float']['output'];
  /** Area or climb ID */
  targetId: Scalars['ID']['output'];
  /** Topo data */
  topoData?: Maybe<Scalars['JSONObject']['output']>;
  /** Target type: 0: climb, 1: area */
  type: Scalars['Int']['output'];
};

/** Input parameters for deleting a tag */
export type EntityTagDeleteInput = {
  mediaId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

/** Filter for organizations that have not excluded themselves from an area. */
export type ExcludedAreaIdsFilter = {
  excludes?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};

export type ExperimentalAuthorType = {
  displayName: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export enum Field {
  Density = 'density',
  TotalClimbs = 'totalClimbs'
}

export type Filter = {
  area_name?: InputMaybe<AreaFilter>;
  field_compare?: InputMaybe<Array<InputMaybe<ComparisonFilter>>>;
  leaf_status?: InputMaybe<LeafFilter>;
  path_tokens?: InputMaybe<PathFilter>;
};

export type GetTagInput = {
  tagIds: Array<InputMaybe<Scalars['ID']['input']>>;
};

export type GetTagResponse = {
  __typename?: 'GetTagResponse';
  tag?: Maybe<Array<Maybe<Tag>>>;
};

/**
 * There are a number of grading systems around the world, this enum
 * specifies the system. Developers will then use the key to best understand
 * its value.
 *
 * https://en.wikipedia.org/wiki/Grade_(climbing)
 */
export type GradeType = {
  __typename?: 'GradeType';
  brazilianCrux?: Maybe<Scalars['String']['output']>;
  /**
   * Ewbank grade
   * https://en.wikipedia.org/wiki/Grade_(climbing)#Ewbank
   */
  ewbank?: Maybe<Scalars['String']['output']>;
  /**
   * Fontainebleau grading system, the most widely used grading system in Europe.
   * Mostly used for bouldering.
   * https://www.99boulders.com/bouldering-grades#font-scale-aka-fontainebleau-scale
   */
  font?: Maybe<Scalars['String']['output']>;
  french?: Maybe<Scalars['String']['output']>;
  /**
   * UIAA grading system, typically used in Central Europe (e.g. Germany, Austria, Switzerland).
   * Uses Arabic numerals, e.g. "7-", "7", "7+". (Roman numerals, like "VII-", are not supported).
   * https://en.wikipedia.org/wiki/Grade_(climbing)#UIAA
   */
  uiaa?: Maybe<Scalars['String']['output']>;
  /** [read more about vscale](https://www.99boulders.com/bouldering-grades#v-scale) */
  vscale?: Maybe<Scalars['String']['output']>;
  /**
   * Water Ice Grading System
   * https://en.wikipedia.org/wiki/Ice_climbing#WI-grades
   */
  wi?: Maybe<Scalars['String']['output']>;
  /**
   * Yosemite Decimal System
   * https://en.wikipedia.org/wiki/Grade_(climbing)#Yosemite_Decimal_System
   */
  yds?: Maybe<Scalars['String']['output']>;
};

export type GradeTypeInput = {
  brazilianCrux?: InputMaybe<Scalars['String']['input']>;
  ewbank?: InputMaybe<Scalars['String']['input']>;
  font?: InputMaybe<Scalars['String']['input']>;
  french?: InputMaybe<Scalars['String']['input']>;
  uiaa?: InputMaybe<Scalars['String']['input']>;
  vscale?: InputMaybe<Scalars['String']['input']>;
  yds?: InputMaybe<Scalars['String']['input']>;
};

export type History = {
  __typename?: 'History';
  changes?: Maybe<Array<Maybe<Change>>>;
  createdAt: Scalars['Date']['output'];
  editedBy: Scalars['ID']['output'];
  editedByUser?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  operation: Scalars['String']['output'];
};

/** Media object metadata */
export type IMediaMetadata = {
  /** Valid format: jpeg, png, webp, avif */
  format: Scalars['String']['output'];
  /** Height in pixels */
  height: Scalars['Int']['output'];
  /** Unique id */
  id: Scalars['ID']['output'];
  /** File size in bytes */
  size: Scalars['Int']['output'];
  /** Upload time */
  uploadTime: Scalars['Date']['output'];
  /** Width in pixels */
  width: Scalars['Int']['output'];
};

export type LeafFilter = {
  isLeaf: Scalars['Boolean']['input'];
};

/**
 * Users can be principally identified either by their username or by their user id.
 * There is reason to prefer the latter over the former - usernames can be changed, and
 * in any scenario where you might be caching or trying to produce a permanent resource
 * reference you will want to prefer the uuid over the username.
 */
export type LocateUserBy = {
  userUuid?: InputMaybe<Scalars['ID']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

/** All tags by an author */
export type MediaByUsers = {
  __typename?: 'MediaByUsers';
  mediaWithTags?: Maybe<Array<Maybe<MediaWithTags>>>;
  userUuid: Scalars['ID']['output'];
  username?: Maybe<Scalars['String']['output']>;
};

/**
 * Media connection.
 * See https://graphql.org/learn/pagination/
 */
export type MediaConnection = {
  __typename?: 'MediaConnection';
  edges: Array<MediaEdge>;
  pageInfo: PageInfo;
};

/** Input parameters for deleting a media */
export type MediaDeleteInput = {
  mediaId: Scalars['ID']['input'];
};

/**
 * Media edge.
 * See https://graphql.org/learn/pagination/
 */
export type MediaEdge = {
  __typename?: 'MediaEdge';
  /** Current node cursor.  The frontend can pass this value to the `after` input parameter to fetch the next page. */
  cursor: Scalars['ID']['output'];
  /** Media object */
  node?: Maybe<MediaWithTags>;
};

/** Input parameters for creating a new tag */
export type MediaEntityTagInput = {
  /** What this tag is pointing to (a climb/area) */
  entityId: Scalars['ID']['input'];
  /** 0: climb, 1: area */
  entityType: Scalars['Int']['input'];
  /** Target media id */
  mediaId: Scalars['ID']['input'];
  /** Optional topo data */
  topoData?: InputMaybe<Scalars['JSONObject']['input']>;
};

export type MediaForFeedInput = {
  maxFiles?: InputMaybe<Scalars['Int']['input']>;
  maxUsers?: InputMaybe<Scalars['Int']['input']>;
};

/** Input parameters for querying a single media object */
export type MediaInput = {
  id: Scalars['ID']['input'];
};

/** Represent a media object */
export type MediaWithTags = IMediaMetadata & {
  __typename?: 'MediaWithTags';
  entityTags?: Maybe<Array<Maybe<EntityTag>>>;
  format: Scalars['String']['output'];
  height: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  mediaUrl: Scalars['String']['output'];
  size: Scalars['Int']['output'];
  uploadTime: Scalars['Date']['output'];
  user?: Maybe<UserPublicProfile>;
  username?: Maybe<Scalars['String']['output']>;
  width: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Add an area */
  addArea?: Maybe<Area>;
  /**
   * Add an entity tag to a media.  Calling this function with the same
   * mediaId, entityUuid, and entityType will update the topo data.
   */
  addEntityTag: EntityTag;
  /** Add one or more media objects. Each media object may contain one tag. */
  addMediaObjects?: Maybe<Array<Maybe<MediaWithTags>>>;
  /** Add an organization */
  addOrganization?: Maybe<Organization>;
  /**
   * Adds a tick to the MongoDB
   *
   * NOTE: climbId is created from the hash function on the backend,
   * input the MP id into the function to create it, or just search for the climb on open beta
   *
   * NOTE: source is either MP or OB, which stand for Mountain project and open beta respectively
   * the database will reject anything else. This allows us to determine where the tick was created
   */
  addTick?: Maybe<TickType>;
  /**
   * Add or update an area tree in bulk, including climbs (and their pitches).
   * You can start at any point in the tree given a valid parent area with its uuid.
   * If starting at the root level, the `countryCode` must be provided.
   */
  bulkImportAreas?: Maybe<BulkImportResult>;
  /**
   * Deletes all ticks created by a user by the userId,
   * mainly a dev feature for while we are working on getting the schema correct
   */
  deleteAllTicks?: Maybe<DeleteAllTickResult>;
  /** Delete one or more climbs */
  deleteClimbs?: Maybe<Scalars['Int']['output']>;
  /** Delete one media object. */
  deleteMediaObject: Scalars['Boolean']['output'];
  /** Deletes a tick from MongoDB by the _id property created in the database */
  deleteTick?: Maybe<DeleteSingleTickResult>;
  editTick?: Maybe<TickType>;
  /**
   * Imports a users ticks from mountain project, this feature also deletes all ticks previously imported from mountain project
   * before importing them, allowing users to constantly update their ticks without creating duplicates
   */
  importTicks?: Maybe<Array<Maybe<TickType>>>;
  /** Remove an area */
  removeArea?: Maybe<Area>;
  /** Remove an entity tag from a media. */
  removeEntityTag: Scalars['Boolean']['output'];
  /** Set area destination flag */
  setDestinationFlag?: Maybe<Area>;
  /** Update area attributes */
  updateArea?: Maybe<Area>;
  /** Update area sorting order in bulk */
  updateAreasSortingOrder?: Maybe<Array<Maybe<Scalars['ID']['output']>>>;
  /** Update a single climb by its ID. Unlike updateClimbs, this doesn't require the parent area ID. */
  updateClimb?: Maybe<Climb>;
  /** Create or update one or more climbs. */
  updateClimbs?: Maybe<Array<Maybe<Scalars['ID']['output']>>>;
  /** Update organization attributes */
  updateOrganization?: Maybe<Organization>;
  /**
   * Update a user profile or create a new profile if it doesn't exist.
   * Note:  The email field is required when creating a new profile and
   * will be ignore in subsequent update calls to prevent users from
   * changing their email.  The frontend  calls this API whenever a new user
   * logs in; their email therefore should have been verified at this point.
   * When we support email address change in the future, we will need to
   * create a separate update-email mutation to make sure users take the
   * neccessary steps.
   */
  updateUserProfile?: Maybe<Scalars['Boolean']['output']>;
};


export type MutationAddAreaArgs = {
  input?: InputMaybe<AreaInput>;
};


export type MutationAddEntityTagArgs = {
  input?: InputMaybe<MediaEntityTagInput>;
};


export type MutationAddMediaObjectsArgs = {
  input?: InputMaybe<Array<InputMaybe<NewMediaObjectInput>>>;
};


export type MutationAddOrganizationArgs = {
  input?: InputMaybe<AddOrganizationInput>;
};


export type MutationAddTickArgs = {
  input?: InputMaybe<Tick>;
};


export type MutationBulkImportAreasArgs = {
  input?: InputMaybe<BulkImportInput>;
};


export type MutationDeleteAllTicksArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDeleteClimbsArgs = {
  input?: InputMaybe<DeleteManyClimbsInput>;
};


export type MutationDeleteMediaObjectArgs = {
  input: MediaDeleteInput;
};


export type MutationDeleteTickArgs = {
  _id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationEditTickArgs = {
  input?: InputMaybe<TickFilter>;
};


export type MutationImportTicksArgs = {
  input?: InputMaybe<Array<InputMaybe<Tick>>>;
};


export type MutationRemoveAreaArgs = {
  input?: InputMaybe<RemoveAreaInput>;
};


export type MutationRemoveEntityTagArgs = {
  input: EntityTagDeleteInput;
};


export type MutationSetDestinationFlagArgs = {
  input?: InputMaybe<DestinationFlagInput>;
};


export type MutationUpdateAreaArgs = {
  input?: InputMaybe<AreEditableFieldsInput>;
};


export type MutationUpdateAreasSortingOrderArgs = {
  input?: InputMaybe<Array<InputMaybe<AreaSortingInput>>>;
};


export type MutationUpdateClimbArgs = {
  input: SingleClimbInput;
};


export type MutationUpdateClimbsArgs = {
  input?: InputMaybe<UpdateClimbsInput>;
};


export type MutationUpdateOrganizationArgs = {
  input?: InputMaybe<OrganizationEditableFieldsInput>;
};


export type MutationUpdateUserProfileArgs = {
  input?: InputMaybe<UserProfileInput>;
};

export type NewMediaObjectInput = {
  entityTag?: InputMaybe<EmbeddedEntityInput>;
  format: Scalars['String']['input'];
  height: Scalars['Int']['input'];
  mediaUrl: Scalars['String']['input'];
  size: Scalars['Int']['input'];
  userUuid: Scalars['ID']['input'];
  width: Scalars['Int']['input'];
};

export type OrgFilter = {
  associatedAreaIds?: InputMaybe<AssociatedAreaIdsFilter>;
  displayName?: InputMaybe<DisplayNameFilter>;
  excludedAreaIds?: InputMaybe<ExcludedAreaIdsFilter>;
};

export type OrgSort = {
  displayName?: InputMaybe<Scalars['Int']['input']>;
  updatedAt?: InputMaybe<Scalars['Int']['input']>;
};

/** A climbing area, wall or crag */
export type Organization = {
  __typename?: 'Organization';
  associatedAreaIds?: Maybe<Array<Maybe<Scalars['UUID']['output']>>>;
  content?: Maybe<OrganizationContent>;
  createdAt?: Maybe<Scalars['Date']['output']>;
  createdBy?: Maybe<Scalars['UUID']['output']>;
  /** Name of organization to be displayed on the site. */
  displayName: Scalars['String']['output'];
  excludedAreaIds?: Maybe<Array<Maybe<Scalars['UUID']['output']>>>;
  id: Scalars['ID']['output'];
  /** We use orgId for identification of organizations. The id field is used in internal database relations. */
  orgId: Scalars['UUID']['output'];
  /**
   * Type of organization. Currently we only support local climbing organizations, which
   * are associated with certain climbing areas. In future there may be advocacy groups
   * like the Access Fund or interest groups like the American Alpine Club that are not
   * associated with any specific climbing areas.
   */
  orgType: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['Date']['output']>;
  updatedBy?: Maybe<Scalars['UUID']['output']>;
};

export type OrganizationContent = {
  __typename?: 'OrganizationContent';
  description?: Maybe<Scalars['String']['output']>;
  donationLink?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  facebookLink?: Maybe<Scalars['String']['output']>;
  hardwareReportLink?: Maybe<Scalars['String']['output']>;
  instagramLink?: Maybe<Scalars['String']['output']>;
  website?: Maybe<Scalars['String']['output']>;
};

export type OrganizationEditableFieldsInput = {
  associatedAreaIds?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
  description?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  donationLink?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  excludedAreaIds?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
  facebookLink?: InputMaybe<Scalars['String']['input']>;
  hardwareReportLink?: InputMaybe<Scalars['String']['input']>;
  instagramLink?: InputMaybe<Scalars['String']['input']>;
  orgId: Scalars['UUID']['input'];
  website?: InputMaybe<Scalars['String']['input']>;
};

export type OrganizationHistoryFilter = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orgId?: InputMaybe<Scalars['UUID']['input']>;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  /** Not yet supported. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** True if there are more data after the last cursor. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Total number of items. */
  totalItems: Scalars['Int']['output'];
};

export type PathFilter = {
  exactMatch?: InputMaybe<Scalars['Boolean']['input']>;
  size?: InputMaybe<Scalars['Int']['input']>;
  tokens: Array<InputMaybe<Scalars['String']['input']>>;
};

export type Pitch = {
  __typename?: 'Pitch';
  boltsCount?: Maybe<Scalars['Int']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  grades?: Maybe<GradeType>;
  id: Scalars['ID']['output'];
  length?: Maybe<Scalars['Int']['output']>;
  parentId: Scalars['ID']['output'];
  pitchNumber: Scalars['Int']['output'];
  type?: Maybe<ClimbType>;
};

export type PitchInput = {
  disciplines?: InputMaybe<DisciplineType>;
  grades?: InputMaybe<GradeTypeInput>;
  id: Scalars['ID']['input'];
  parentId: Scalars['ID']['input'];
  pitchNumber: Scalars['Int']['input'];
};

export type Point = {
  lat?: InputMaybe<Scalars['Float']['input']>;
  lng?: InputMaybe<Scalars['Float']['input']>;
};

export type Query = {
  __typename?: 'Query';
  area?: Maybe<Area>;
  /** Get media cursor with paginationg for an area */
  areaMediaPagination?: Maybe<AreaMedia>;
  areas?: Maybe<Array<Maybe<Area>>>;
  /**
   * Bulk download an area and its children starting from ancestors paths (inclusive).
   * To keep payload at a reasonable size ancestors must have at least 2 elements.
   */
  bulkAreas?: Maybe<Array<Maybe<Area>>>;
  climb?: Maybe<Climb>;
  /** Get media cursor with paginationg for a climb */
  climbMediaPagination?: Maybe<ClimbMedia>;
  countries?: Maybe<Array<Maybe<Area>>>;
  cragsNear?: Maybe<Array<Maybe<CragsNear>>>;
  cragsWithin?: Maybe<Array<Maybe<Area>>>;
  getAreaHistory?: Maybe<Array<Maybe<History>>>;
  getChangeHistory?: Maybe<Array<Maybe<History>>>;
  /** Get recent media with tags group by users. */
  getMediaForFeed?: Maybe<Array<Maybe<MediaByUsers>>>;
  getOrganizationHistory?: Maybe<Array<Maybe<History>>>;
  getTags?: Maybe<GetTagResponse>;
  /** Get a list of users and their tagged photo count. */
  getTagsLeaderboard?: Maybe<TagsLeaderboard>;
  /** Get all media belonging to a user (media with or without tags). */
  getUserMedia?: Maybe<Array<Maybe<MediaWithTags>>>;
  /**
   * Get media cursor with pagination support.  We only support forward cursor.
   * See
   * - https://graphql.org/learn/pagination/
   * - https://relay.dev/graphql/connections.htm
   */
  getUserMediaPagination?: Maybe<UserMedia>;
  /** A users page is their profile + their media (paginated) */
  getUserPublicPage?: Maybe<UserPublicPage>;
  /** Get user public profile */
  getUserPublicProfileByUuid?: Maybe<UserPublicProfile>;
  /** Get username object by user uuid */
  getUsername?: Maybe<UsernameDetail>;
  /** Get single media object. */
  media?: Maybe<MediaWithTags>;
  organization?: Maybe<Organization>;
  organizations?: Maybe<Array<Maybe<Organization>>>;
  stats?: Maybe<Stats>;
  user: UserPublicProfile;
  userPage: UserPublicPage;
  /** Gets all of the users current ticks by their Auth-0 userId or username */
  userTicks?: Maybe<Array<Maybe<TickType>>>;
  /**
   * Gets all of the users current ticks for a specific climb by their
   * Auth-0 userId and Open-Beta ClimbId
   */
  userTicksByClimbId?: Maybe<Array<Maybe<TickType>>>;
  /** Check to see if a username already exists in the database. */
  usernameExists?: Maybe<Scalars['Boolean']['output']>;
};


export type QueryAreaArgs = {
  uuid?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryAreaMediaPaginationArgs = {
  input?: InputMaybe<AreaMediaInput>;
};


export type QueryAreasArgs = {
  filter?: InputMaybe<Filter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<Sort>;
};


export type QueryBulkAreasArgs = {
  ancestors: Array<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryClimbArgs = {
  uuid?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryClimbMediaPaginationArgs = {
  input?: InputMaybe<ClimbMediaInput>;
};


export type QueryCragsNearArgs = {
  includeCrags?: InputMaybe<Scalars['Boolean']['input']>;
  lnglat?: InputMaybe<Point>;
  maxDistance?: InputMaybe<Scalars['Int']['input']>;
  minDistance?: InputMaybe<Scalars['Int']['input']>;
  placeId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCragsWithinArgs = {
  filter?: InputMaybe<SearchWithinFilter>;
};


export type QueryGetAreaHistoryArgs = {
  filter?: InputMaybe<AreaHistoryFilter>;
};


export type QueryGetChangeHistoryArgs = {
  filter?: InputMaybe<AllHistoryFilter>;
};


export type QueryGetMediaForFeedArgs = {
  input?: InputMaybe<MediaForFeedInput>;
};


export type QueryGetOrganizationHistoryArgs = {
  filter?: InputMaybe<OrganizationHistoryFilter>;
};


export type QueryGetTagsArgs = {
  input?: InputMaybe<GetTagInput>;
};


export type QueryGetTagsLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetUserMediaArgs = {
  input?: InputMaybe<UserMediaInput>;
};


export type QueryGetUserMediaPaginationArgs = {
  input?: InputMaybe<UserMediaInput>;
};


export type QueryGetUserPublicPageArgs = {
  input: UsernameInput;
};


export type QueryGetUserPublicProfileByUuidArgs = {
  input: UserIdInput;
};


export type QueryGetUsernameArgs = {
  input: UserIdInput;
};


export type QueryMediaArgs = {
  input?: InputMaybe<MediaInput>;
};


export type QueryOrganizationArgs = {
  muuid?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryOrganizationsArgs = {
  filter?: InputMaybe<OrgFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<OrgSort>;
};


export type QueryUserArgs = {
  input: LocateUserBy;
};


export type QueryUserPageArgs = {
  input: LocateUserBy;
};


export type QueryUserTicksArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId?: InputMaybe<Scalars['UUID']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserTicksByClimbIdArgs = {
  climbId?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUsernameExistsArgs = {
  input: UsernameInput;
};

export type RemoveAreaInput = {
  uuid: Scalars['String']['input'];
};

export type RemoveTagInput = {
  tagId: Scalars['ID']['input'];
};

export type RemoveTagResponse = {
  __typename?: 'RemoveTagResponse';
  numDeleted?: Maybe<Scalars['String']['output']>;
};

/**
 * rating indicates the quality and spacing of a route's available protection for a
 * competent climber. Amusingly, the letter codes associated with the different
 * protection ratings are based on the American system for movie ratings:
 */
export enum SafetyEnum {
  /** Generally good protection with a few sections of poor protection */
  Pg = 'PG',
  /** Fair protection that may result in long, potentially dangerous falls */
  Pg13 = 'PG13',
  /** where there's limited protection and the possibility of serious injury */
  R = 'R',
  Unspecified = 'UNSPECIFIED',
  /** No protection and overall the route is extremely dangerous. */
  X = 'X',
  /**
   * a part of a route where there isn’t any protection for a while below you.
   * It happens when a route is sparsely bolted or there isn’t be anywhere to
   * place a cam. “Running it out” is common on classic routes and
   * sometimes hard sport overhangs.
   * [source](https://www.climbernews.com/what-is-a-runout-in-climbing/)
   */
  Runout = 'runout',
  Terrain = 'terrain'
}

export type SearchWithinFilter = {
  bbox?: InputMaybe<Array<InputMaybe<Scalars['Float']['input']>>>;
  zoom?: InputMaybe<Scalars['Float']['input']>;
};

/** Climb change record.  If the climb ID is omitted or does not exist in the database, a new climb will be created. */
export type SingleClimbChangeInput = {
  /** Number of fixed anchors */
  boltsCount?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  disciplines?: InputMaybe<DisciplineType>;
  experimentalAuthor?: InputMaybe<ExperimentalAuthorType>;
  /** Legacy FA data */
  fa?: InputMaybe<Scalars['String']['input']>;
  grade?: InputMaybe<Scalars['String']['input']>;
  /** Climb UUID */
  id?: InputMaybe<Scalars['ID']['input']>;
  leftRightIndex?: InputMaybe<Scalars['Int']['input']>;
  /** Length in meters */
  length?: InputMaybe<Scalars['Int']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** List of Pitch objects representing individual pitches of a multi-pitch climb */
  pitches?: InputMaybe<Array<InputMaybe<PitchInput>>>;
  protection?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a single climb by its ID. The climb must already exist. */
export type SingleClimbInput = {
  /** Number of fixed anchors */
  boltsCount?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  disciplines?: InputMaybe<DisciplineType>;
  experimentalAuthor?: InputMaybe<ExperimentalAuthorType>;
  /** Legacy FA data */
  fa?: InputMaybe<Scalars['String']['input']>;
  grade?: InputMaybe<Scalars['String']['input']>;
  /** Climb UUID (required) */
  id: Scalars['ID']['input'];
  leftRightIndex?: InputMaybe<Scalars['Int']['input']>;
  /** Length in meters */
  length?: InputMaybe<Scalars['Int']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** List of Pitch objects representing individual pitches of a multi-pitch climb */
  pitches?: InputMaybe<Array<InputMaybe<PitchInput>>>;
  protection?: InputMaybe<Scalars['String']['input']>;
};

export type Sort = {
  area_name?: InputMaybe<Scalars['Int']['input']>;
  density?: InputMaybe<Scalars['Int']['input']>;
  totalClimbs?: InputMaybe<Scalars['Int']['input']>;
};

export type Stats = {
  __typename?: 'Stats';
  totalClimbs: Scalars['Int']['output'];
  totalCrags: Scalars['Int']['output'];
};

/** Tags are what link a post & photo to climb(s) and area(s). XMedia contains an array of TagIds. */
export type Tag = {
  __typename?: 'Tag';
  _id?: Maybe<Scalars['ID']['output']>;
  destinationId: Scalars['ID']['output'];
  destinationType: Scalars['Int']['output'];
  mediaUrl: Scalars['String']['output'];
  mediaUuid: Scalars['ID']['output'];
};

export type TagsByUser = {
  __typename?: 'TagsByUser';
  total: Scalars['Int']['output'];
  userUuid: Scalars['ID']['output'];
  username?: Maybe<Scalars['String']['output']>;
};

export type TagsLeaderboard = {
  __typename?: 'TagsLeaderboard';
  allTime?: Maybe<AllTimeTags>;
};

/**
 * This is our tick type input, containing the name,
 * notes climbId, etc of the ticked climb, all fields are required
 *
 * NOTE: source must either be MP or OB which stand for Mountain Project, or Open Beta respectively
 */
export type Tick = {
  attemptType?: InputMaybe<TickAttemptType>;
  climbId: Scalars['String']['input'];
  dateClimbed: Scalars['Date']['input'];
  grade?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  source: TickSource;
  style?: InputMaybe<TickStyle>;
  userId: Scalars['String']['input'];
};

/** The type of attempt the user wants to tick for a route. */
export enum TickAttemptType {
  /** Attempt */
  Attempt = 'Attempt',
  /** Flash: Sending a route first try with prior knowledge */
  Flash = 'Flash',
  /** French Free: Doing the route with pulling on gear or draws */
  Frenchfree = 'Frenchfree',
  /** Onsight: Sending a route fist try with no prior knowledge */
  Onsight = 'Onsight',
  /** Pinkpoint: Sending a route with no falls on pre-placed gear */
  Pinkpoint = 'Pinkpoint',
  /** Redpoint */
  Redpoint = 'Redpoint',
  /** Repeat */
  Repeat = 'Repeat',
  /** Send: Sending a route with no falls */
  Send = 'Send'
}

/** Takes in the MongoId and a tick object to replace the old tick object with */
export type TickFilter = {
  _id: Scalars['ID']['input'];
  updatedTick?: InputMaybe<Tick>;
};

/** The tick sources that openbeta supports. */
export enum TickSource {
  /** MountainProject (imported tick) */
  Mp = 'MP',
  /** OpenBeta (native tick) */
  Ob = 'OB'
}

export enum TickStyle {
  /** Aid */
  Aid = 'Aid',
  /** Boulder */
  Boulder = 'Boulder',
  /** Follow */
  Follow = 'Follow',
  /** Lead */
  Lead = 'Lead',
  /** Solo */
  Solo = 'Solo',
  /** tr */
  Tr = 'TR'
}

/**
 * This is our tick type, containing the name, notes climbId,
 * etc of the ticked climb NOTE: source must either be MP or OB
 * which stand for Mountain Project, or Open Beta respectively
 */
export type TickType = {
  __typename?: 'TickType';
  _id?: Maybe<Scalars['ID']['output']>;
  /**
   * Describe the type of successful attempt that was made here.
   * Attempt, Flash, Redpoint, Onsight, would be examples of values you might find here.
   * This is again a free-form field. Data of practically any descriptive nature may find
   * itself here.
   */
  attemptType?: Maybe<TickAttemptType>;
  /** The climb associated with this tick. Null when the climb doesn't exist in our database. */
  climb?: Maybe<Climb>;
  /**
   * Which climb is ascociated with this tick? There is weak-relationship between this ID
   * and a climb document in the climbs collection. This is because we support importing
   * climbs from external sources, and we may not have a climb document for every climb
   *
   * When source is OpenBeta, this can be understood as a foreign key to the climbs collection uuid.
   */
  climbId?: Maybe<Scalars['String']['output']>;
  /**
   * Not the same as date created. Ticks can be back-filled by the user, and do
   * not need to be logged at the time that the tick is created inside the mongo
   * database.
   * This is a string because we do not enforce any particular date format at this time.
   */
  dateClimbed?: Maybe<Scalars['Date']['output']>;
  /**
   * What grade is this tick ascociated with?
   * This exists in the tick document both for easy-fetching and to ensure
   * proper operation when importing ticks for entities that cannot be located
   * within OpenBeta's database.
   */
  grade?: Maybe<Scalars['String']['output']>;
  /**
   * The name of this climb.
   *
   * When the tick is imported from an external data source, there is no relational guarentee,
   * and as such we need this field filled out to be able to display the name of the climb.
   *
   * Native ticks may have this field enforced against the climb that it relates to.
   * If the name changes in its related climb document, the value stored here may be back-updated
   * to reflect the new name.
   */
  name?: Maybe<Scalars['String']['output']>;
  /**
   * freeform text field that a user fills out as commentary on this tick. This unstructured data
   * is one of the most important ones on the tick, as users may give their human opinion on the
   * climb attempt that they made.
   *
   * Sandbagged, Chipped, bad conditions, may all be examples of notes that a user may submit to accompany
   * the tick.
   */
  notes?: Maybe<Scalars['String']['output']>;
  source?: Maybe<TickSource>;
  /**
   * Arbitrary string that represents the style of the climb.
   * Lead, toprope, bouldering, would be examples of values you might find here.
   * If this is a native tick, you can enforce updated values here by referencing
   * the climb document (climbId -> climbs:uuid)
   */
  style?: Maybe<TickStyle>;
  /** User public profile */
  user: UserPublicProfile;
  /** User that this tick belongs to  */
  userId?: Maybe<Scalars['String']['output']>;
};

/** Create/update climbs input parameter. */
export type UpdateClimbsInput = {
  /** Array of change records */
  changes?: InputMaybe<Array<InputMaybe<SingleClimbChangeInput>>>;
  /** Parent area ID */
  parentId: Scalars['ID']['input'];
};

export type UpdateDescription = {
  __typename?: 'UpdateDescription';
  updatedFields?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type UserIdInput = {
  userUuid: Scalars['ID']['input'];
};

/**
 * User media cursor with pagination support.
 * See https://graphql.org/learn/pagination/
 */
export type UserMedia = {
  __typename?: 'UserMedia';
  mediaConnection: MediaConnection;
  userUuid: Scalars['ID']['output'];
};

/** Input parameters for user media queries. */
export type UserMediaInput = {
  /** Returning page data after this cursor (exclusive).  Return the first page if omitted. */
  after?: InputMaybe<Scalars['ID']['input']>;
  /** Number of objects per page (Default = 6). */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Max number of objects return.  Ignore when using with pagination query. */
  maxFiles?: InputMaybe<Scalars['Int']['input']>;
  /** User UUID.  Ex: a0ca9ebb-aa3b-4bb0-8ddd-7c8b2ed228a5 */
  userUuid: Scalars['ID']['input'];
};

export type UserProfileInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  userUuid: Scalars['ID']['input'];
  username?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type UserPublicPage = {
  __typename?: 'UserPublicPage';
  media?: Maybe<UserMedia>;
  profile?: Maybe<UserPublicProfile>;
};

export type UserPublicProfile = {
  __typename?: 'UserPublicProfile';
  avatar?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  userUuid: Scalars['ID']['output'];
  username: Scalars['String']['output'];
  website?: Maybe<Scalars['String']['output']>;
};

/** Username detail object */
export type UsernameDetail = {
  __typename?: 'UsernameDetail';
  lastUpdated?: Maybe<Scalars['Date']['output']>;
  userUuid: Scalars['ID']['output'];
  username?: Maybe<Scalars['String']['output']>;
};

export type UsernameInput = {
  username: Scalars['String']['input'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Document:
    | ( PartiallyResolvedArea )
    | ( ClimbPrimitive )
    | ( Organization )
  ;
}>;

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  IMediaMetadata: ( MediaRecord );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AddOrganizationInput: AddOrganizationInput;
  AddTagInput: AddTagInput;
  AddTagResponse: ResolverTypeWrapper<AddTagResponse>;
  AggregateType: ResolverTypeWrapper<AggregateType>;
  AllHistoryFilter: AllHistoryFilter;
  AllTimeTags: ResolverTypeWrapper<AllTimeTags>;
  AreEditableFieldsInput: AreEditableFieldsInput;
  Area: ResolverTypeWrapper<PartiallyResolvedArea>;
  AreaContent: ResolverTypeWrapper<AreaContent>;
  AreaFilter: AreaFilter;
  AreaHistoryFilter: AreaHistoryFilter;
  AreaInput: AreaInput;
  AreaMedia: ResolverTypeWrapper<Omit<AreaMedia, 'mediaConnection'> & { mediaConnection: ResolversTypes['MediaConnection'] }>;
  AreaMediaInput: AreaMediaInput;
  AreaMetadata: ResolverTypeWrapper<AreaMetadata>;
  AreaSortingInput: AreaSortingInput;
  AssociatedAreaIdsFilter: AssociatedAreaIdsFilter;
  AuthorMetadata: ResolverTypeWrapper<AuthorMetadata>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BulkImportAreaInput: BulkImportAreaInput;
  BulkImportClimbInput: BulkImportClimbInput;
  BulkImportInput: BulkImportInput;
  BulkImportPitchesInput: BulkImportPitchesInput;
  BulkImportResult: ResolverTypeWrapper<Omit<BulkImportResult, 'addedAreas' | 'addedOrUpdatedClimbs' | 'updatedAreas'> & { addedAreas?: Maybe<Array<Maybe<ResolversTypes['Area']>>>, addedOrUpdatedClimbs?: Maybe<Array<Maybe<ResolversTypes['Climb']>>>, updatedAreas?: Maybe<Array<Maybe<ResolversTypes['Area']>>> }>;
  Change: ResolverTypeWrapper<Omit<Change, 'fullDocument'> & { fullDocument?: Maybe<ResolversTypes['Document']> }>;
  Climb: ResolverTypeWrapper<ClimbPrimitive>;
  ClimbMedia: ResolverTypeWrapper<Omit<ClimbMedia, 'mediaConnection'> & { mediaConnection: ResolversTypes['MediaConnection'] }>;
  ClimbMediaInput: ClimbMediaInput;
  ClimbMetadata: ResolverTypeWrapper<ClimbMetadata>;
  ClimbType: ResolverTypeWrapper<ClimbType>;
  CompareType: CompareType;
  ComparisonFilter: ComparisonFilter;
  Content: ResolverTypeWrapper<Content>;
  CountByDisciplineType: ResolverTypeWrapper<CountByDisciplineType>;
  CountByGradeBand: ResolverTypeWrapper<CountByGradeBand>;
  CountByGroupType: ResolverTypeWrapper<CountByGroupType>;
  CountryInput: CountryInput;
  CragsNear: ResolverTypeWrapper<Omit<CragsNear, 'crags'> & { crags?: Maybe<Array<Maybe<ResolversTypes['Area']>>> }>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DeleteAllTickResult: ResolverTypeWrapper<DeleteAllTickResult>;
  DeleteManyClimbsInput: DeleteManyClimbsInput;
  DeleteSingleTickResult: ResolverTypeWrapper<DeleteSingleTickResult>;
  DestinationFlagInput: DestinationFlagInput;
  DisciplineStatsType: ResolverTypeWrapper<DisciplineStatsType>;
  DisciplineType: DisciplineType;
  DisplayNameFilter: DisplayNameFilter;
  Document: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['Document']>;
  EmbeddedAreaMediaInput: EmbeddedAreaMediaInput;
  EmbeddedClimbMediaInput: EmbeddedClimbMediaInput;
  EmbeddedEntityInput: EmbeddedEntityInput;
  EntityTag: ResolverTypeWrapper<EntityTag>;
  EntityTagDeleteInput: EntityTagDeleteInput;
  ExcludedAreaIdsFilter: ExcludedAreaIdsFilter;
  ExperimentalAuthorType: ExperimentalAuthorType;
  Field: Field;
  Filter: Filter;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GetTagInput: GetTagInput;
  GetTagResponse: ResolverTypeWrapper<GetTagResponse>;
  GradeType: ResolverTypeWrapper<GradeType>;
  GradeTypeInput: GradeTypeInput;
  History: ResolverTypeWrapper<Omit<History, 'changes'> & { changes?: Maybe<Array<Maybe<ResolversTypes['Change']>>> }>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  IMediaMetadata: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['IMediaMetadata']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSONObject: ResolverTypeWrapper<Scalars['JSONObject']['output']>;
  LeafFilter: LeafFilter;
  LocateUserBy: LocateUserBy;
  MediaByUsers: ResolverTypeWrapper<Omit<MediaByUsers, 'mediaWithTags'> & { mediaWithTags?: Maybe<Array<Maybe<ResolversTypes['MediaWithTags']>>> }>;
  MediaConnection: ResolverTypeWrapper<Omit<MediaConnection, 'edges'> & { edges: Array<ResolversTypes['MediaEdge']> }>;
  MediaDeleteInput: MediaDeleteInput;
  MediaEdge: ResolverTypeWrapper<Omit<MediaEdge, 'node'> & { node?: Maybe<ResolversTypes['MediaWithTags']> }>;
  MediaEntityTagInput: MediaEntityTagInput;
  MediaForFeedInput: MediaForFeedInput;
  MediaInput: MediaInput;
  MediaWithTags: ResolverTypeWrapper<MediaRecord>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  NewMediaObjectInput: NewMediaObjectInput;
  OrgFilter: OrgFilter;
  OrgSort: OrgSort;
  Organization: ResolverTypeWrapper<Organization>;
  OrganizationContent: ResolverTypeWrapper<OrganizationContent>;
  OrganizationEditableFieldsInput: OrganizationEditableFieldsInput;
  OrganizationHistoryFilter: OrganizationHistoryFilter;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PathFilter: PathFilter;
  Pitch: ResolverTypeWrapper<Pitch>;
  PitchInput: PitchInput;
  Point: Point;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  RemoveAreaInput: RemoveAreaInput;
  RemoveTagInput: RemoveTagInput;
  RemoveTagResponse: ResolverTypeWrapper<RemoveTagResponse>;
  SafetyEnum: SafetyEnum;
  SearchWithinFilter: SearchWithinFilter;
  SingleClimbChangeInput: SingleClimbChangeInput;
  SingleClimbInput: SingleClimbInput;
  Sort: Sort;
  Stats: ResolverTypeWrapper<Stats>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Tag: ResolverTypeWrapper<Tag>;
  TagsByUser: ResolverTypeWrapper<TagsByUser>;
  TagsLeaderboard: ResolverTypeWrapper<TagsLeaderboard>;
  Tick: Tick;
  TickAttemptType: TickAttemptType;
  TickFilter: TickFilter;
  TickSource: TickSource;
  TickStyle: TickStyle;
  TickType: ResolverTypeWrapper<Omit<TickType, 'climb'> & { climb?: Maybe<ResolversTypes['Climb']> }>;
  UUID: ResolverTypeWrapper<Scalars['UUID']['output']>;
  UpdateClimbsInput: UpdateClimbsInput;
  UpdateDescription: ResolverTypeWrapper<UpdateDescription>;
  UserIDInput: UserIdInput;
  UserMedia: ResolverTypeWrapper<Omit<UserMedia, 'mediaConnection'> & { mediaConnection: ResolversTypes['MediaConnection'] }>;
  UserMediaInput: UserMediaInput;
  UserProfileInput: UserProfileInput;
  UserPublicPage: ResolverTypeWrapper<Omit<UserPublicPage, 'media'> & { media?: Maybe<ResolversTypes['UserMedia']> }>;
  UserPublicProfile: ResolverTypeWrapper<UserPublicProfile>;
  UsernameDetail: ResolverTypeWrapper<UsernameDetail>;
  UsernameInput: UsernameInput;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AddOrganizationInput: AddOrganizationInput;
  AddTagInput: AddTagInput;
  AddTagResponse: AddTagResponse;
  AggregateType: AggregateType;
  AllHistoryFilter: AllHistoryFilter;
  AllTimeTags: AllTimeTags;
  AreEditableFieldsInput: AreEditableFieldsInput;
  Area: PartiallyResolvedArea;
  AreaContent: AreaContent;
  AreaFilter: AreaFilter;
  AreaHistoryFilter: AreaHistoryFilter;
  AreaInput: AreaInput;
  AreaMedia: Omit<AreaMedia, 'mediaConnection'> & { mediaConnection: ResolversParentTypes['MediaConnection'] };
  AreaMediaInput: AreaMediaInput;
  AreaMetadata: AreaMetadata;
  AreaSortingInput: AreaSortingInput;
  AssociatedAreaIdsFilter: AssociatedAreaIdsFilter;
  AuthorMetadata: AuthorMetadata;
  Boolean: Scalars['Boolean']['output'];
  BulkImportAreaInput: BulkImportAreaInput;
  BulkImportClimbInput: BulkImportClimbInput;
  BulkImportInput: BulkImportInput;
  BulkImportPitchesInput: BulkImportPitchesInput;
  BulkImportResult: Omit<BulkImportResult, 'addedAreas' | 'addedOrUpdatedClimbs' | 'updatedAreas'> & { addedAreas?: Maybe<Array<Maybe<ResolversParentTypes['Area']>>>, addedOrUpdatedClimbs?: Maybe<Array<Maybe<ResolversParentTypes['Climb']>>>, updatedAreas?: Maybe<Array<Maybe<ResolversParentTypes['Area']>>> };
  Change: Omit<Change, 'fullDocument'> & { fullDocument?: Maybe<ResolversParentTypes['Document']> };
  Climb: ClimbPrimitive;
  ClimbMedia: Omit<ClimbMedia, 'mediaConnection'> & { mediaConnection: ResolversParentTypes['MediaConnection'] };
  ClimbMediaInput: ClimbMediaInput;
  ClimbMetadata: ClimbMetadata;
  ClimbType: ClimbType;
  ComparisonFilter: ComparisonFilter;
  Content: Content;
  CountByDisciplineType: CountByDisciplineType;
  CountByGradeBand: CountByGradeBand;
  CountByGroupType: CountByGroupType;
  CountryInput: CountryInput;
  CragsNear: Omit<CragsNear, 'crags'> & { crags?: Maybe<Array<Maybe<ResolversParentTypes['Area']>>> };
  Date: Scalars['Date']['output'];
  DeleteAllTickResult: DeleteAllTickResult;
  DeleteManyClimbsInput: DeleteManyClimbsInput;
  DeleteSingleTickResult: DeleteSingleTickResult;
  DestinationFlagInput: DestinationFlagInput;
  DisciplineStatsType: DisciplineStatsType;
  DisciplineType: DisciplineType;
  DisplayNameFilter: DisplayNameFilter;
  Document: ResolversUnionTypes<ResolversParentTypes>['Document'];
  EmbeddedAreaMediaInput: EmbeddedAreaMediaInput;
  EmbeddedClimbMediaInput: EmbeddedClimbMediaInput;
  EmbeddedEntityInput: EmbeddedEntityInput;
  EntityTag: EntityTag;
  EntityTagDeleteInput: EntityTagDeleteInput;
  ExcludedAreaIdsFilter: ExcludedAreaIdsFilter;
  ExperimentalAuthorType: ExperimentalAuthorType;
  Filter: Filter;
  Float: Scalars['Float']['output'];
  GetTagInput: GetTagInput;
  GetTagResponse: GetTagResponse;
  GradeType: GradeType;
  GradeTypeInput: GradeTypeInput;
  History: Omit<History, 'changes'> & { changes?: Maybe<Array<Maybe<ResolversParentTypes['Change']>>> };
  ID: Scalars['ID']['output'];
  IMediaMetadata: ResolversInterfaceTypes<ResolversParentTypes>['IMediaMetadata'];
  Int: Scalars['Int']['output'];
  JSONObject: Scalars['JSONObject']['output'];
  LeafFilter: LeafFilter;
  LocateUserBy: LocateUserBy;
  MediaByUsers: Omit<MediaByUsers, 'mediaWithTags'> & { mediaWithTags?: Maybe<Array<Maybe<ResolversParentTypes['MediaWithTags']>>> };
  MediaConnection: Omit<MediaConnection, 'edges'> & { edges: Array<ResolversParentTypes['MediaEdge']> };
  MediaDeleteInput: MediaDeleteInput;
  MediaEdge: Omit<MediaEdge, 'node'> & { node?: Maybe<ResolversParentTypes['MediaWithTags']> };
  MediaEntityTagInput: MediaEntityTagInput;
  MediaForFeedInput: MediaForFeedInput;
  MediaInput: MediaInput;
  MediaWithTags: MediaRecord;
  Mutation: Record<PropertyKey, never>;
  NewMediaObjectInput: NewMediaObjectInput;
  OrgFilter: OrgFilter;
  OrgSort: OrgSort;
  Organization: Organization;
  OrganizationContent: OrganizationContent;
  OrganizationEditableFieldsInput: OrganizationEditableFieldsInput;
  OrganizationHistoryFilter: OrganizationHistoryFilter;
  PageInfo: PageInfo;
  PathFilter: PathFilter;
  Pitch: Pitch;
  PitchInput: PitchInput;
  Point: Point;
  Query: Record<PropertyKey, never>;
  RemoveAreaInput: RemoveAreaInput;
  RemoveTagInput: RemoveTagInput;
  RemoveTagResponse: RemoveTagResponse;
  SearchWithinFilter: SearchWithinFilter;
  SingleClimbChangeInput: SingleClimbChangeInput;
  SingleClimbInput: SingleClimbInput;
  Sort: Sort;
  Stats: Stats;
  String: Scalars['String']['output'];
  Tag: Tag;
  TagsByUser: TagsByUser;
  TagsLeaderboard: TagsLeaderboard;
  Tick: Tick;
  TickFilter: TickFilter;
  TickType: Omit<TickType, 'climb'> & { climb?: Maybe<ResolversParentTypes['Climb']> };
  UUID: Scalars['UUID']['output'];
  UpdateClimbsInput: UpdateClimbsInput;
  UpdateDescription: UpdateDescription;
  UserIDInput: UserIdInput;
  UserMedia: Omit<UserMedia, 'mediaConnection'> & { mediaConnection: ResolversParentTypes['MediaConnection'] };
  UserMediaInput: UserMediaInput;
  UserProfileInput: UserProfileInput;
  UserPublicPage: Omit<UserPublicPage, 'media'> & { media?: Maybe<ResolversParentTypes['UserMedia']> };
  UserPublicProfile: UserPublicProfile;
  UsernameDetail: UsernameDetail;
  UsernameInput: UsernameInput;
}>;

export type AddTagResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AddTagResponse'] = ResolversParentTypes['AddTagResponse']> = ResolversObject<{
  tagId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type AggregateTypeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AggregateType'] = ResolversParentTypes['AggregateType']> = ResolversObject<{
  byDiscipline?: Resolver<Maybe<ResolversTypes['CountByDisciplineType']>, ParentType, ContextType>;
  byGrade?: Resolver<Maybe<Array<Maybe<ResolversTypes['CountByGroupType']>>>, ParentType, ContextType>;
  byGradeBand?: Resolver<Maybe<ResolversTypes['CountByGradeBand']>, ParentType, ContextType>;
}>;

export type AllTimeTagsResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AllTimeTags'] = ResolversParentTypes['AllTimeTags']> = ResolversObject<{
  byUsers?: Resolver<Array<Maybe<ResolversTypes['TagsByUser']>>, ParentType, ContextType>;
  totalMediaWithTags?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type AreaResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Area'] = ResolversParentTypes['Area']> = ResolversObject<{
  aggregate?: Resolver<Maybe<ResolversTypes['AggregateType']>, ParentType, ContextType>;
  ancestors?: Resolver<Array<Maybe<ResolversTypes['String']>>, ParentType, ContextType>;
  areaName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  area_name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  authorMetadata?: Resolver<ResolversTypes['AuthorMetadata'], ParentType, ContextType>;
  children?: Resolver<Maybe<Array<Maybe<ResolversTypes['Area']>>>, ParentType, ContextType>;
  climbs?: Resolver<Maybe<Array<Maybe<ResolversTypes['Climb']>>>, ParentType, ContextType>;
  content?: Resolver<Maybe<ResolversTypes['AreaContent']>, ParentType, ContextType>;
  density?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  gradeContext?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageByteSum?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  media?: Resolver<Maybe<Array<Maybe<ResolversTypes['MediaWithTags']>>>, ParentType, ContextType>;
  mediaPagination?: Resolver<Maybe<ResolversTypes['AreaMedia']>, ParentType, ContextType, Partial<AreaMediaPaginationArgs>>;
  metadata?: Resolver<ResolversTypes['AreaMetadata'], ParentType, ContextType>;
  organizations?: Resolver<Maybe<Array<Maybe<ResolversTypes['Organization']>>>, ParentType, ContextType>;
  pathHash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pathTokens?: Resolver<Array<Maybe<ResolversTypes['String']>>, ParentType, ContextType>;
  shortCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  totalClimbs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  uuid?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AreaContentResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AreaContent'] = ResolversParentTypes['AreaContent']> = ResolversObject<{
  areaLocation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type AreaMediaResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AreaMedia'] = ResolversParentTypes['AreaMedia']> = ResolversObject<{
  areaUuid?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mediaConnection?: Resolver<ResolversTypes['MediaConnection'], ParentType, ContextType>;
}>;

export type AreaMetadataResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AreaMetadata'] = ResolversParentTypes['AreaMetadata']> = ResolversObject<{
  areaId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  area_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  bbox?: Resolver<Maybe<Array<Maybe<ResolversTypes['Float']>>>, ParentType, ContextType>;
  isBoulder?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  isDestination?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lat?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  leaf?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  leftRightIndex?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  lng?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  mp_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  polygon?: Resolver<Maybe<Array<Maybe<Array<Maybe<ResolversTypes['Float']>>>>>, ParentType, ContextType>;
}>;

export type AuthorMetadataResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AuthorMetadata'] = ResolversParentTypes['AuthorMetadata']> = ResolversObject<{
  createdAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  createdByUser?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updatedBy?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  updatedByUser?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type BulkImportResultResolvers<ContextType = Context, ParentType extends ResolversParentTypes['BulkImportResult'] = ResolversParentTypes['BulkImportResult']> = ResolversObject<{
  addedAreas?: Resolver<Maybe<Array<Maybe<ResolversTypes['Area']>>>, ParentType, ContextType>;
  addedOrUpdatedClimbs?: Resolver<Maybe<Array<Maybe<ResolversTypes['Climb']>>>, ParentType, ContextType>;
  updatedAreas?: Resolver<Maybe<Array<Maybe<ResolversTypes['Area']>>>, ParentType, ContextType>;
}>;

export type ChangeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Change'] = ResolversParentTypes['Change']> = ResolversObject<{
  changeId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  dbOp?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fullDocument?: Resolver<Maybe<ResolversTypes['Document']>, ParentType, ContextType>;
  updateDescription?: Resolver<Maybe<ResolversTypes['UpdateDescription']>, ParentType, ContextType>;
}>;

export type ClimbResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Climb'] = ResolversParentTypes['Climb']> = ResolversObject<{
  ancestors?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  authorMetadata?: Resolver<ResolversTypes['AuthorMetadata'], ParentType, ContextType>;
  boltsCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  content?: Resolver<ResolversTypes['Content'], ParentType, ContextType>;
  fa?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  gradeContext?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  grades?: Resolver<Maybe<ResolversTypes['GradeType']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  media?: Resolver<Maybe<Array<Maybe<ResolversTypes['MediaWithTags']>>>, ParentType, ContextType>;
  mediaPagination?: Resolver<Maybe<ResolversTypes['ClimbMedia']>, ParentType, ContextType, Partial<ClimbMediaPaginationArgs>>;
  metadata?: Resolver<ResolversTypes['ClimbMetadata'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent?: Resolver<ResolversTypes['Area'], ParentType, ContextType>;
  pathTokens?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  pitches?: Resolver<Maybe<Array<Maybe<ResolversTypes['Pitch']>>>, ParentType, ContextType>;
  safety?: Resolver<Maybe<ResolversTypes['SafetyEnum']>, ParentType, ContextType>;
  ticks?: Resolver<Maybe<Array<Maybe<ResolversTypes['TickType']>>>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ClimbType'], ParentType, ContextType>;
  uuid?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  yds?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ClimbMediaResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ClimbMedia'] = ResolversParentTypes['ClimbMedia']> = ResolversObject<{
  climbUuid?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mediaConnection?: Resolver<ResolversTypes['MediaConnection'], ParentType, ContextType>;
}>;

export type ClimbMetadataResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ClimbMetadata'] = ResolversParentTypes['ClimbMetadata']> = ResolversObject<{
  climbId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  climb_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lat?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  leftRightIndex?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  left_right_index?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  lng?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  mp_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type ClimbTypeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ClimbType'] = ResolversParentTypes['ClimbType']> = ResolversObject<{
  aid?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  alpine?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  bouldering?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  deepwatersolo?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  ice?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  mixed?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  snow?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  sport?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  tr?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  trad?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
}>;

export type ContentResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Content'] = ResolversParentTypes['Content']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  protection?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type CountByDisciplineTypeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CountByDisciplineType'] = ResolversParentTypes['CountByDisciplineType']> = ResolversObject<{
  aid?: Resolver<Maybe<ResolversTypes['DisciplineStatsType']>, ParentType, ContextType>;
  alpine?: Resolver<Maybe<ResolversTypes['DisciplineStatsType']>, ParentType, ContextType>;
  boulder?: Resolver<Maybe<ResolversTypes['DisciplineStatsType']>, ParentType, ContextType>;
  bouldering?: Resolver<Maybe<ResolversTypes['DisciplineStatsType']>, ParentType, ContextType>;
  deepwatersolo?: Resolver<Maybe<ResolversTypes['DisciplineStatsType']>, ParentType, ContextType>;
  ice?: Resolver<Maybe<ResolversTypes['DisciplineStatsType']>, ParentType, ContextType>;
  mixed?: Resolver<Maybe<ResolversTypes['DisciplineStatsType']>, ParentType, ContextType>;
  snow?: Resolver<Maybe<ResolversTypes['DisciplineStatsType']>, ParentType, ContextType>;
  sport?: Resolver<Maybe<ResolversTypes['DisciplineStatsType']>, ParentType, ContextType>;
  tr?: Resolver<Maybe<ResolversTypes['DisciplineStatsType']>, ParentType, ContextType>;
  trad?: Resolver<Maybe<ResolversTypes['DisciplineStatsType']>, ParentType, ContextType>;
}>;

export type CountByGradeBandResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CountByGradeBand'] = ResolversParentTypes['CountByGradeBand']> = ResolversObject<{
  advanced?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  beginner?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  expert?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  intermediate?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  unknown?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
}>;

export type CountByGroupTypeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CountByGroupType'] = ResolversParentTypes['CountByGroupType']> = ResolversObject<{
  count?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type CragsNearResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CragsNear'] = ResolversParentTypes['CragsNear']> = ResolversObject<{
  _id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  crags?: Resolver<Maybe<Array<Maybe<ResolversTypes['Area']>>>, ParentType, ContextType>;
  placeId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export type DeleteAllTickResultResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DeleteAllTickResult'] = ResolversParentTypes['DeleteAllTickResult']> = ResolversObject<{
  deletedCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  removed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type DeleteSingleTickResultResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DeleteSingleTickResult'] = ResolversParentTypes['DeleteSingleTickResult']> = ResolversObject<{
  _id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  removed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type DisciplineStatsTypeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DisciplineStatsType'] = ResolversParentTypes['DisciplineStatsType']> = ResolversObject<{
  bands?: Resolver<ResolversTypes['CountByGradeBand'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type DocumentResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Document'] = ResolversParentTypes['Document']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Area' | 'Climb' | 'Organization', ParentType, ContextType>;
}>;

export type EntityTagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['EntityTag'] = ResolversParentTypes['EntityTag']> = ResolversObject<{
  ancestors?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  areaName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  climbName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lat?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  lng?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  targetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  topoData?: Resolver<Maybe<ResolversTypes['JSONObject']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GetTagResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['GetTagResponse'] = ResolversParentTypes['GetTagResponse']> = ResolversObject<{
  tag?: Resolver<Maybe<Array<Maybe<ResolversTypes['Tag']>>>, ParentType, ContextType>;
}>;

export type GradeTypeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['GradeType'] = ResolversParentTypes['GradeType']> = ResolversObject<{
  brazilianCrux?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ewbank?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  font?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  french?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uiaa?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  vscale?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  wi?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  yds?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type HistoryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['History'] = ResolversParentTypes['History']> = ResolversObject<{
  changes?: Resolver<Maybe<Array<Maybe<ResolversTypes['Change']>>>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  editedBy?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  editedByUser?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  operation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type IMediaMetadataResolvers<ContextType = Context, ParentType extends ResolversParentTypes['IMediaMetadata'] = ResolversParentTypes['IMediaMetadata']> = ResolversObject<{
  __resolveType: TypeResolveFn<'MediaWithTags', ParentType, ContextType>;
}>;

export interface JsonObjectScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSONObject'], any> {
  name: 'JSONObject';
}

export type MediaByUsersResolvers<ContextType = Context, ParentType extends ResolversParentTypes['MediaByUsers'] = ResolversParentTypes['MediaByUsers']> = ResolversObject<{
  mediaWithTags?: Resolver<Maybe<Array<Maybe<ResolversTypes['MediaWithTags']>>>, ParentType, ContextType>;
  userUuid?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  username?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type MediaConnectionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['MediaConnection'] = ResolversParentTypes['MediaConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['MediaEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
}>;

export type MediaEdgeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['MediaEdge'] = ResolversParentTypes['MediaEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  node?: Resolver<Maybe<ResolversTypes['MediaWithTags']>, ParentType, ContextType>;
}>;

export type MediaWithTagsResolvers<ContextType = Context, ParentType extends ResolversParentTypes['MediaWithTags'] = ResolversParentTypes['MediaWithTags']> = ResolversObject<{
  entityTags?: Resolver<Maybe<Array<Maybe<ResolversTypes['EntityTag']>>>, ParentType, ContextType>;
  format?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  height?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mediaUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  size?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  uploadTime?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['UserPublicProfile']>, ParentType, ContextType>;
  username?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  width?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  addArea?: Resolver<Maybe<ResolversTypes['Area']>, ParentType, ContextType, Partial<MutationAddAreaArgs>>;
  addEntityTag?: Resolver<ResolversTypes['EntityTag'], ParentType, ContextType, Partial<MutationAddEntityTagArgs>>;
  addMediaObjects?: Resolver<Maybe<Array<Maybe<ResolversTypes['MediaWithTags']>>>, ParentType, ContextType, Partial<MutationAddMediaObjectsArgs>>;
  addOrganization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, Partial<MutationAddOrganizationArgs>>;
  addTick?: Resolver<Maybe<ResolversTypes['TickType']>, ParentType, ContextType, Partial<MutationAddTickArgs>>;
  bulkImportAreas?: Resolver<Maybe<ResolversTypes['BulkImportResult']>, ParentType, ContextType, Partial<MutationBulkImportAreasArgs>>;
  deleteAllTicks?: Resolver<Maybe<ResolversTypes['DeleteAllTickResult']>, ParentType, ContextType, Partial<MutationDeleteAllTicksArgs>>;
  deleteClimbs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType, Partial<MutationDeleteClimbsArgs>>;
  deleteMediaObject?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteMediaObjectArgs, 'input'>>;
  deleteTick?: Resolver<Maybe<ResolversTypes['DeleteSingleTickResult']>, ParentType, ContextType, Partial<MutationDeleteTickArgs>>;
  editTick?: Resolver<Maybe<ResolversTypes['TickType']>, ParentType, ContextType, Partial<MutationEditTickArgs>>;
  importTicks?: Resolver<Maybe<Array<Maybe<ResolversTypes['TickType']>>>, ParentType, ContextType, Partial<MutationImportTicksArgs>>;
  removeArea?: Resolver<Maybe<ResolversTypes['Area']>, ParentType, ContextType, Partial<MutationRemoveAreaArgs>>;
  removeEntityTag?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRemoveEntityTagArgs, 'input'>>;
  setDestinationFlag?: Resolver<Maybe<ResolversTypes['Area']>, ParentType, ContextType, Partial<MutationSetDestinationFlagArgs>>;
  updateArea?: Resolver<Maybe<ResolversTypes['Area']>, ParentType, ContextType, Partial<MutationUpdateAreaArgs>>;
  updateAreasSortingOrder?: Resolver<Maybe<Array<Maybe<ResolversTypes['ID']>>>, ParentType, ContextType, Partial<MutationUpdateAreasSortingOrderArgs>>;
  updateClimb?: Resolver<Maybe<ResolversTypes['Climb']>, ParentType, ContextType, RequireFields<MutationUpdateClimbArgs, 'input'>>;
  updateClimbs?: Resolver<Maybe<Array<Maybe<ResolversTypes['ID']>>>, ParentType, ContextType, Partial<MutationUpdateClimbsArgs>>;
  updateOrganization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, Partial<MutationUpdateOrganizationArgs>>;
  updateUserProfile?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, Partial<MutationUpdateUserProfileArgs>>;
}>;

export type OrganizationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = ResolversObject<{
  associatedAreaIds?: Resolver<Maybe<Array<Maybe<ResolversTypes['UUID']>>>, ParentType, ContextType>;
  content?: Resolver<Maybe<ResolversTypes['OrganizationContent']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['UUID']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  excludedAreaIds?: Resolver<Maybe<Array<Maybe<ResolversTypes['UUID']>>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orgId?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  orgType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updatedBy?: Resolver<Maybe<ResolversTypes['UUID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationContentResolvers<ContextType = Context, ParentType extends ResolversParentTypes['OrganizationContent'] = ResolversParentTypes['OrganizationContent']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  donationLink?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  facebookLink?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hardwareReportLink?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  instagramLink?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  website?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalItems?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type PitchResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Pitch'] = ResolversParentTypes['Pitch']> = ResolversObject<{
  boltsCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  grades?: Resolver<Maybe<ResolversTypes['GradeType']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  length?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  parentId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  pitchNumber?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<Maybe<ResolversTypes['ClimbType']>, ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  area?: Resolver<Maybe<ResolversTypes['Area']>, ParentType, ContextType, Partial<QueryAreaArgs>>;
  areaMediaPagination?: Resolver<Maybe<ResolversTypes['AreaMedia']>, ParentType, ContextType, Partial<QueryAreaMediaPaginationArgs>>;
  areas?: Resolver<Maybe<Array<Maybe<ResolversTypes['Area']>>>, ParentType, ContextType, Partial<QueryAreasArgs>>;
  bulkAreas?: Resolver<Maybe<Array<Maybe<ResolversTypes['Area']>>>, ParentType, ContextType, RequireFields<QueryBulkAreasArgs, 'ancestors'>>;
  climb?: Resolver<Maybe<ResolversTypes['Climb']>, ParentType, ContextType, Partial<QueryClimbArgs>>;
  climbMediaPagination?: Resolver<Maybe<ResolversTypes['ClimbMedia']>, ParentType, ContextType, Partial<QueryClimbMediaPaginationArgs>>;
  countries?: Resolver<Maybe<Array<Maybe<ResolversTypes['Area']>>>, ParentType, ContextType>;
  cragsNear?: Resolver<Maybe<Array<Maybe<ResolversTypes['CragsNear']>>>, ParentType, ContextType, RequireFields<QueryCragsNearArgs, 'includeCrags' | 'maxDistance' | 'minDistance'>>;
  cragsWithin?: Resolver<Maybe<Array<Maybe<ResolversTypes['Area']>>>, ParentType, ContextType, Partial<QueryCragsWithinArgs>>;
  getAreaHistory?: Resolver<Maybe<Array<Maybe<ResolversTypes['History']>>>, ParentType, ContextType, Partial<QueryGetAreaHistoryArgs>>;
  getChangeHistory?: Resolver<Maybe<Array<Maybe<ResolversTypes['History']>>>, ParentType, ContextType, Partial<QueryGetChangeHistoryArgs>>;
  getMediaForFeed?: Resolver<Maybe<Array<Maybe<ResolversTypes['MediaByUsers']>>>, ParentType, ContextType, Partial<QueryGetMediaForFeedArgs>>;
  getOrganizationHistory?: Resolver<Maybe<Array<Maybe<ResolversTypes['History']>>>, ParentType, ContextType, Partial<QueryGetOrganizationHistoryArgs>>;
  getTags?: Resolver<Maybe<ResolversTypes['GetTagResponse']>, ParentType, ContextType, Partial<QueryGetTagsArgs>>;
  getTagsLeaderboard?: Resolver<Maybe<ResolversTypes['TagsLeaderboard']>, ParentType, ContextType, Partial<QueryGetTagsLeaderboardArgs>>;
  getUserMedia?: Resolver<Maybe<Array<Maybe<ResolversTypes['MediaWithTags']>>>, ParentType, ContextType, Partial<QueryGetUserMediaArgs>>;
  getUserMediaPagination?: Resolver<Maybe<ResolversTypes['UserMedia']>, ParentType, ContextType, Partial<QueryGetUserMediaPaginationArgs>>;
  getUserPublicPage?: Resolver<Maybe<ResolversTypes['UserPublicPage']>, ParentType, ContextType, RequireFields<QueryGetUserPublicPageArgs, 'input'>>;
  getUserPublicProfileByUuid?: Resolver<Maybe<ResolversTypes['UserPublicProfile']>, ParentType, ContextType, RequireFields<QueryGetUserPublicProfileByUuidArgs, 'input'>>;
  getUsername?: Resolver<Maybe<ResolversTypes['UsernameDetail']>, ParentType, ContextType, RequireFields<QueryGetUsernameArgs, 'input'>>;
  media?: Resolver<Maybe<ResolversTypes['MediaWithTags']>, ParentType, ContextType, Partial<QueryMediaArgs>>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, Partial<QueryOrganizationArgs>>;
  organizations?: Resolver<Maybe<Array<Maybe<ResolversTypes['Organization']>>>, ParentType, ContextType, Partial<QueryOrganizationsArgs>>;
  stats?: Resolver<Maybe<ResolversTypes['Stats']>, ParentType, ContextType>;
  user?: Resolver<ResolversTypes['UserPublicProfile'], ParentType, ContextType, RequireFields<QueryUserArgs, 'input'>>;
  userPage?: Resolver<ResolversTypes['UserPublicPage'], ParentType, ContextType, RequireFields<QueryUserPageArgs, 'input'>>;
  userTicks?: Resolver<Maybe<Array<Maybe<ResolversTypes['TickType']>>>, ParentType, ContextType, Partial<QueryUserTicksArgs>>;
  userTicksByClimbId?: Resolver<Maybe<Array<Maybe<ResolversTypes['TickType']>>>, ParentType, ContextType, Partial<QueryUserTicksByClimbIdArgs>>;
  usernameExists?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<QueryUsernameExistsArgs, 'input'>>;
}>;

export type RemoveTagResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['RemoveTagResponse'] = ResolversParentTypes['RemoveTagResponse']> = ResolversObject<{
  numDeleted?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type StatsResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Stats'] = ResolversParentTypes['Stats']> = ResolversObject<{
  totalClimbs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalCrags?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type TagResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Tag'] = ResolversParentTypes['Tag']> = ResolversObject<{
  _id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  destinationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  destinationType?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  mediaUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mediaUuid?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type TagsByUserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TagsByUser'] = ResolversParentTypes['TagsByUser']> = ResolversObject<{
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  userUuid?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  username?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type TagsLeaderboardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TagsLeaderboard'] = ResolversParentTypes['TagsLeaderboard']> = ResolversObject<{
  allTime?: Resolver<Maybe<ResolversTypes['AllTimeTags']>, ParentType, ContextType>;
}>;

export type TickTypeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TickType'] = ResolversParentTypes['TickType']> = ResolversObject<{
  _id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  attemptType?: Resolver<Maybe<ResolversTypes['TickAttemptType']>, ParentType, ContextType>;
  climb?: Resolver<Maybe<ResolversTypes['Climb']>, ParentType, ContextType>;
  climbId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dateClimbed?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  grade?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source?: Resolver<Maybe<ResolversTypes['TickSource']>, ParentType, ContextType>;
  style?: Resolver<Maybe<ResolversTypes['TickStyle']>, ParentType, ContextType>;
  user?: Resolver<ResolversTypes['UserPublicProfile'], ParentType, ContextType>;
  userId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export interface UuidScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['UUID'], any> {
  name: 'UUID';
}

export type UpdateDescriptionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UpdateDescription'] = ResolversParentTypes['UpdateDescription']> = ResolversObject<{
  updatedFields?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>;
}>;

export type UserMediaResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UserMedia'] = ResolversParentTypes['UserMedia']> = ResolversObject<{
  mediaConnection?: Resolver<ResolversTypes['MediaConnection'], ParentType, ContextType>;
  userUuid?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type UserPublicPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UserPublicPage'] = ResolversParentTypes['UserPublicPage']> = ResolversObject<{
  media?: Resolver<Maybe<ResolversTypes['UserMedia']>, ParentType, ContextType>;
  profile?: Resolver<Maybe<ResolversTypes['UserPublicProfile']>, ParentType, ContextType>;
}>;

export type UserPublicProfileResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UserPublicProfile'] = ResolversParentTypes['UserPublicProfile']> = ResolversObject<{
  avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  bio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userUuid?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  website?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type UsernameDetailResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UsernameDetail'] = ResolversParentTypes['UsernameDetail']> = ResolversObject<{
  lastUpdated?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  userUuid?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  username?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type Resolvers<ContextType = Context> = ResolversObject<{
  AddTagResponse?: AddTagResponseResolvers<ContextType>;
  AggregateType?: AggregateTypeResolvers<ContextType>;
  AllTimeTags?: AllTimeTagsResolvers<ContextType>;
  Area?: AreaResolvers<ContextType>;
  AreaContent?: AreaContentResolvers<ContextType>;
  AreaMedia?: AreaMediaResolvers<ContextType>;
  AreaMetadata?: AreaMetadataResolvers<ContextType>;
  AuthorMetadata?: AuthorMetadataResolvers<ContextType>;
  BulkImportResult?: BulkImportResultResolvers<ContextType>;
  Change?: ChangeResolvers<ContextType>;
  Climb?: ClimbResolvers<ContextType>;
  ClimbMedia?: ClimbMediaResolvers<ContextType>;
  ClimbMetadata?: ClimbMetadataResolvers<ContextType>;
  ClimbType?: ClimbTypeResolvers<ContextType>;
  Content?: ContentResolvers<ContextType>;
  CountByDisciplineType?: CountByDisciplineTypeResolvers<ContextType>;
  CountByGradeBand?: CountByGradeBandResolvers<ContextType>;
  CountByGroupType?: CountByGroupTypeResolvers<ContextType>;
  CragsNear?: CragsNearResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DeleteAllTickResult?: DeleteAllTickResultResolvers<ContextType>;
  DeleteSingleTickResult?: DeleteSingleTickResultResolvers<ContextType>;
  DisciplineStatsType?: DisciplineStatsTypeResolvers<ContextType>;
  Document?: DocumentResolvers<ContextType>;
  EntityTag?: EntityTagResolvers<ContextType>;
  GetTagResponse?: GetTagResponseResolvers<ContextType>;
  GradeType?: GradeTypeResolvers<ContextType>;
  History?: HistoryResolvers<ContextType>;
  IMediaMetadata?: IMediaMetadataResolvers<ContextType>;
  JSONObject?: GraphQLScalarType;
  MediaByUsers?: MediaByUsersResolvers<ContextType>;
  MediaConnection?: MediaConnectionResolvers<ContextType>;
  MediaEdge?: MediaEdgeResolvers<ContextType>;
  MediaWithTags?: MediaWithTagsResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationContent?: OrganizationContentResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Pitch?: PitchResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RemoveTagResponse?: RemoveTagResponseResolvers<ContextType>;
  Stats?: StatsResolvers<ContextType>;
  Tag?: TagResolvers<ContextType>;
  TagsByUser?: TagsByUserResolvers<ContextType>;
  TagsLeaderboard?: TagsLeaderboardResolvers<ContextType>;
  TickType?: TickTypeResolvers<ContextType>;
  UUID?: GraphQLScalarType;
  UpdateDescription?: UpdateDescriptionResolvers<ContextType>;
  UserMedia?: UserMediaResolvers<ContextType>;
  UserPublicPage?: UserPublicPageResolvers<ContextType>;
  UserPublicProfile?: UserPublicProfileResolvers<ContextType>;
  UsernameDetail?: UsernameDetailResolvers<ContextType>;
}>;

