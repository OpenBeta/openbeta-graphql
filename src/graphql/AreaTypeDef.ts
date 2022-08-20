import { gql } from "apollo-server";

export const typeDef = gql`
  type Query {
    area(uuid: ID): Area
    areas(filter: Filter, sort: Sort): [Area]
    stats: Stats
    cragsNear(
      placeId: String
      lnglat: Point
      minDistance: Int = 0
      maxDistance: Int = 48000
      includeCrags: Boolean = false
    ): [CragsNear]
    cragsWithin(filter: SearchWithinFilter): [Area]
  }

  """
  Areas are general-purpose containers used for organizing climbs.
  areas may be as large as a country or as small as a single boulder.

  Areas with no children are considered "leaf" areas, they are entities like
  boulders, crags, etc.
  """
  type Area {
    id: ID!
    "The primary name that this area goes by"
    areaName: String!

    """
    Alternate names appear about as much for Areas as they do for climbs. Crag names,
    boulder names, and even larger container areas are prone to having names that
    are easy to accidentally fork in local climbing communities.
    """
    alternateNames: [String!]

    metadata: AreaMetadata!
    """
    Climbs that appear in this area.
    Given the staggering number of ways this field could be inadvertantly used to mess up
    client performance, the message I will give is: pay attention to your query.
    """
    climbs: [Climb!]

    """
    This areas direct child areas. This may be null for leaf areas, as they have
    no child areas. Climbs map only appear on leaf areas, and leaf areas may not
    be area parents, so children will always be null for leaf areas
    """
    children: [Area!]

    """
    The direct parent for this area. Areas do not necesserily have parents, in
    cases where the area is a root area or in cases where this is an orphaned
    Area.
    """
    parent: Area

    ancestors: [String]!

    aggregate: AggregateType

    content: AreaContent

    "Path tokens hashed into a single string, mostly used for rapid"
    pathHash: String!

    pathTokens: [String]!

    """
    Total climbs per square km.
    Not a totally helpful metric for smaller areas - especially leaf areas - but
    for areas that are larger, this can yield some useful stuff.

    If you wanna grapple quickly with the cases where this stops being a USEFUL metric,
    check out https://www.grandatlastours.com/2016/06/18/the-vatican-city-popes-per-square-mile/
    """
    density: Float!

    "How many climbs appear in this area"
    totalClimbs: Int!

    """
    Media in this area, whether inherited from climbs or tagged directly to
    the area itself.
    """
    media: [MediaTagType!]
  }

  type AreaMetadata {
    isDestination: Boolean!
    "Shorthand that shows this area has no children"
    leaf: Boolean!
    lat: Float!
    lng: Float!
    bbox: [Float]!
    left_right_index: Int!
    leftRightIndex: Int!
    mp_id: String!
  }

  """
  Areas can contain thousands of climbs. The most performant way to get top-down
  visibility is to leverage aggregations of that data.
  """
  type AggregateType {
    """
    Get the distribution of grades in this area. The data presents as an
    un-interpolated histogram of grades in this area.
    """
    byGrade: [CountByGroupType]
    """
    Get the distribution of climbing disciplines in this area. The data presents as an
    un-interpolated histogram of disciplines in this area.
    """
    byDiscipline: CountByDisciplineType
    """
    Get the distribution of broad grades in this area, split into the abstraction of
    beginner, intermediate, advanced, expert.
    """
    byGradeBand: CountByGradeBand
  }

  type CountByDisciplineType {
    trad: DisciplineStatsType
    sport: DisciplineStatsType
    boulder: DisciplineStatsType
    alpine: DisciplineStatsType
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
    beginner: Int
    intermediate: Int
    advance: Int
    expert: Int
  }

  """
  User-composed content for areas is a largely unknown quantity early in the life of
  OpenBeta, but areaContent gives an easy way to enumerate fields that present as
  paragraph-like or article-like content.
  """
  type AreaContent {
    "free text description of this area / crag. Where it is, what it looks like, etc."
    description: String
  }

  input Point {
    lat: Float
    lng: Float
  }

  input SearchWithinFilter {
    bbox: [Float]
    zoom: Float
  }

  input Sort {
    areaName: Int
    density: Int
    totalClimbs: Int
  }

  input Filter {
    areaName: AreaFilter
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

  input ComparisonFilter {
    field: Field
    num: Float
    comparison: CompareType
  }

  input PathFilter {
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
`;
