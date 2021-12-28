import { gql } from 'apollo-server'

export const typeDef = gql`
  type Query {
    area(id: ID!): Area
    areas(name: String, nameContains: String): [Area]
  }

  type Area {
    area_name: String!
    metadata: AreaMetadata!
    climbs: [Climb]
    children: [Area]
    content: Content
  }

  type AreaMetadata {
    lat: Float
    lng: Float
    left_right_index: Int
    mp_id: String
    area_id: String!
  }

  type Content {
    description: String
    location: String
    protection: String
  }
`
