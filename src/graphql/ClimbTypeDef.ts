import { gql } from 'apollo-server'

export const typeDef = gql`
  type Query {
    climb(id: ID, uuid: ID): Climb
  }

  "A climbing route or a boulder problem"
  type Climb {
    id: ID!
    uuid: ID!
    name: String!
    fa: String!
    yds: String!
    type: ClimbType!
    safety: SafetyEnum!
    metadata: ClimbMetadata!
    content: Content!
    pathTokens: [String!]!
    ancestors: [String!]!
  }

  type ClimbMetadata {
    lat: Float
    lng: Float
    left_right_index: Int
    leftRightIndex: Int
    mp_id: String
    climb_id: ID!
    climbId: ID!
  }

  type Content {
    description: String
    location: String
    protection: String
  }

  type ClimbType {
    trad: Boolean
    sport: Boolean
    bouldering: Boolean
    alpine: Boolean
    mixed: Boolean
    aid: Boolean
    tr: Boolean
  }

  enum SafetyEnum {
    UNSPECIFIED
    PG 
    PG13
    R
    X
  }
`
