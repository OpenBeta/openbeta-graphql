import { gql } from 'apollo-server'

export const typeDef = gql`
  type Query {
    area(uuid: ID): Area
    areas(filter: Filter, sort: Sort): [Area]
    stats: Stats
    cragsNear(placeId: String, lnglat: Point, minDistance: Int = 0, maxDistance: Int = 48000, includeCrags: Boolean = false): [CragsNear]
    cragsWithin(filter: SearchWithinFilter): [Area]
    countries: [Area]
  }

  "A climbing area, wall or crag"
  type Area {
    id: ID!
    uuid: ID!
    area_name: String!
    areaName: String!
    shortCode: String
    metadata: AreaMetadata!
    climbs: [Climb]
    children: [Area]
    ancestors: [String]!
    aggregate: AggregateType
    content: AreaContent
    pathHash: String!
    pathTokens: [String]!
    gradeContext: String!
    density: Float!
    totalClimbs: Int!
    media: [MediaTagType]
    createdAt: Date
    updatedAt: Date
  }

  type AreaMetadata {
    isDestination: Boolean!
    leaf: Boolean!
    lat: Float!
    lng: Float!
    bbox: [Float]!
    left_right_index: Int!
    leftRightIndex: Int!
    mp_id: String!
    area_id: ID!
    areaId: ID!
  }

  type AggregateType {
    byGrade: [CountByGroupType]
    byDiscipline: CountByDisciplineType
    byGradeBand: CountByGradeBand
  }

  type CountByDisciplineType {
    trad: DisciplineStatsType
    sport: DisciplineStatsType
    boulder: DisciplineStatsType
    alpine: DisciplineStatsType
    snow: DisciplineStatsType
    ice: DisciplineStatsType
    mixed: DisciplineStatsType
    aid: DisciplineStatsType
    tr: DisciplineStatsType
  }

  type DisciplineStatsType {
    total: Int!
    bands: CountByGradeBand!
  }

  type CountByGroupType {
    count: Int
    label: String
  }

  type CountByGradeBand {
    unknown: Int
    beginner: Int
    intermediate: Int
    advanced: Int
    expert: Int
  }

  type AreaContent {
    description: String
  }

  input Point {
    lat: Float,
    lng: Float
  }

  input SearchWithinFilter {
    bbox: [Float]
    zoom: Float
  }

  input Sort {
    area_name: Int
    density: Int
    totalClimbs: Int
  }

  input Filter {
    area_name: AreaFilter
    leaf_status: LeafFilter
    path_tokens: PathFilter
    field_compare: [ComparisonFilter]
  }

  enum Field {
    density
    totalClimbs
  } 

  enum CompareType {
    lt
    gt
    eq
  }

  input ComparisonFilter  { 
    field: Field
    num: Float 
    comparison: CompareType
  }

  input PathFilter  { 
    tokens: [String]!
    exactMatch: Boolean 
    size: Int
  }

  input AreaFilter {
    match: String!
    exactMatch: Boolean
  }

  input LeafFilter {
    isLeaf: Boolean!
  }

  type Stats {
    totalClimbs: Int!
    totalCrags: Int!
  }

  type CragsNear {
    _id: ID!
    placeId: String!
    count: Int!
    crags: [Area]
  }
`
