import { gql } from 'apollo-server'

export const typeDef = gql`
  type Query {
    climb(uuid: ID): Climb
  }

  "A climbing route or a boulder problem"
  type Climb {
    id: ID!
    uuid: ID!
    name: String!
    fa: String!
    yds: String! @deprecated(reason: "migrating to grades field")
    grades: GradeType!
    gradeContext: String
    type: ClimbType!
    safety: SafetyEnum!
    metadata: ClimbMetadata!
    content: Content!
    pathTokens: [String!]!
    ancestors: [String!]!
    media: [MediaTagType]
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
    snow: Boolean
    ice: Boolean
    mixed: Boolean
    aid: Boolean
    tr: Boolean
  }

  type GradeType {
    vscale: String
    yds: String
    french: String
    font: String
  }

  enum SafetyEnum {
    UNSPECIFIED
    PG 
    PG13
    R
    X
  }
`
