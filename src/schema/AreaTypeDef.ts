import { gql } from 'apollo-server'

export const typeDef = gql`
  type Query {
    area(id: ID, uuid: String): Area
    areas(filter: Filter, sort: Sort): [Area]
    stats: Stats
    cragsNear(lnglat: Point, maxDistance: Float): [Area]
  }

  "A climbing area, wall or crag"
  type Area {
    id: ID!
    area_name: String!
    metadata: AreaMetadata!
    climbs: [Climb]
    children: [Area]
    ancestors: [String]!
    aggregate: AggregateType
    content: AreaContent
    pathHash: String!
    pathTokens: [String]!
    density: Float!
    totalClimbs: Int!
  }

  type AreaMetadata {
    leaf: Boolean!
    lat: Float!
    lng: Float!
    bbox: [Float]!
    left_right_index: Int!
    mp_id: String!
    area_id: String!
  }

  type AggregateType {
    byGrade: [CountByGroupType]
    byType: [CountByGroupType]
  }
  
  type CountByGroupType {
    count: Int
    label: String
  }

  type AreaContent {
    description: String
  }

  input Point {
    lat: Float,
    lng: Float
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
`
