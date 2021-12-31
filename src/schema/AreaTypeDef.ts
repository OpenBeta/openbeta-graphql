import { gql } from 'apollo-server'

export const typeDef = gql`
  type Query {
    area(id: ID, uuid: String): Area

    """
    Areas query. 
    - isLeaf = true: only areas with climbs
    - Multiple filters are not supported
    """
    areas(name: String, nameContains: String, 
    isLeaf: Boolean): [Area]
  }

  "A climbing area, wall or crag"
  type Area {
    area_name: String
    metadata: AreaMetadata!
    climbs: [Climb]
    children: [Area]
    content: AreaContent
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
`
