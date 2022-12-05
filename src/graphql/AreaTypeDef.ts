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
    "We use UUID for identification of areas. The id field is used in internal database relations."
    uuid: ID!
    "The name that this area is commonly identified by"
    area_name: String!

    areaName: String!

    "ShortCodes are short, globally uniqe codes that identify significant climbing areas"
    shortCode: String
    metadata: AreaMetadata!

    """
    The climbs that appear within this area. If this area is a leaf node, then these climbs can be understood
    as appearing physically on - rather than within - this area.
    """
    climbs: [Climb]
    """
    The areas that appear within this area. If this area is a leaf node, 
    you will not expect to see any child areas.
    """
    children: [Area]
    "UUIDs of this areas parents, traversing up the heirarchy to the root area."
    ancestors: [String]!

    "areaNames of this areas parents, traversing up the heirarchy to the root area."
    pathTokens: [String]!

    "statistics about this area"
    aggregate: AggregateType
    content: AreaContent

    "pathTokens hashed into a single string"
    pathHash: String!

    """
    Grade systems have minor variations between countries.
    gradeContext is a short abbreviated string that identifies the
    context in which the grade was assigned.

    Area grade contexts will be inherited by its nearest child climbs.
    """
    gradeContext: String!

    "total climbs per km sq"
    density: Float!
    "The total number of climbs in this area"
    totalClimbs: Int!
    "Media associated with this area, or its child climbs"
    media: [MediaTagType]
    createdAt: Date
    updatedAt: Date
  }

  type AreaMetadata {
    isDestination: Boolean!

    """
    If this is true, this area has no children and is a leaf node.
    This means that the area is a crag, boulder or wall that has
    climbs as its direct decendents.
    If both leaf and isBoulder are true:
    - This area is a boulder.
    - climbs[] may only contain boulder problems.
    """
    leaf: Boolean!

    "If this is true, this area is a bouldering area or an individual boulder."
    isBoulder: Boolean

    "centroid latitude of this areas bounding box"
    lat: Float!
    "centroid longitude of this areas bounding box"
    lng: Float!
    "NE and SW corners of the bounding box for this area"
    bbox: [Float]!

    left_right_index: Int!
    leftRightIndex: Int!

    "Mountainproject ID (if associated)"
    mp_id: String!
    area_id: ID!
    areaId: ID!
  }

  """
  Aggregations of data about this area, its children and its climbs.
  """
  type AggregateType {
    """Sums of climbs grouped by arbitrary grade"""
    byGrade: [CountByGroupType]
    """Sums of climbs grouped by discipline"""
    byDiscipline: CountByDisciplineType
    """Sums of climbs grouped by grade band (Rough adjective difficulty)"""
    byGradeBand: CountByGradeBand
  }

  type CountByDisciplineType {
    trad: DisciplineStatsType
    sport: DisciplineStatsType
    bouldering: DisciplineStatsType
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
