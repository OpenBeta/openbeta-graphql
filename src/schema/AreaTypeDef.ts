import { gql } from 'apollo-server'

export const typeDef = gql`
  type Query {
    area(id: ID, uuid: String): Area

    """
    Areas query. 
    - isLeaf = true: only areas with climbs
    - Multiple filters are not supported
    """
    areas(filter: Filter, sort: Sort): [Area]
  }

  "A climbing area, wall or crag"
  type Area {
    area_name: String
    metadata: AreaMetadata!
    climbs: [Climb]
    children: [Area]
    ancestors: [String]
    content: AreaContent
    pathHash: String
    pathTokens: [String]
    id: String
  }

  type AreaMetadata {
    leaf: Boolean
    lat: Float
    lng: Float
    left_right_index: Int
    mp_id: String
    area_id: String!
  }

  type AreaContent {
    description: String
  }
  
  input Sort {
    area_name: Int
  }

  input Filter {
    area_name: AreaFilter
    leaf_status: LeafFilter
    path_tokens: PathFilter
  }

  input PathFilter  { 
    tokens: [String]!, 
    exactMatch: Boolean 
  }

  input AreaFilter {
    match: String!
    exactMatch: Boolean
  }

  input LeafFilter {
    isLeaf: Boolean!
  }
`
