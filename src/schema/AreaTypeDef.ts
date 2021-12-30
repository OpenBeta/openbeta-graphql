import { gql } from 'apollo-server'

export const typeDef = gql`
  type Query {
    area(id: ID!): Area
    """
    Areas query. 
    - isLeaf = true: only areas with climbs
    - Multiple filters are not supported
    """
    areas(filter: Filter
    isLeaf: Boolean, sort: Sort): [Area]
  }

  "A climbing area, wall or crag"
  type Area {
    area_name: String!
    metadata: AreaMetadata!
    climbs: [Climb]
    children: [Area]
    content: AreaContent
    pathHash: String
    id: String
  }

  type AreaMetadata {
    isLeaf: Boolean
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
    area_name: AreaFilter!

  }

  input AreaFilter {
    match: String
    exactMatch: Boolean!
  }
`
