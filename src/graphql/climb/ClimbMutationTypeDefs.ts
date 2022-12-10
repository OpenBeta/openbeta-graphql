import { gql } from 'apollo-server'

const ClimbEditTypeDefs = gql`
  type Mutation {
    addClimbs(input: NewClimbsInput): [ID]
  }

  input NewClimbsInput {
    parentId: ID!
    climbs: [SingleClimbInput]!
  }

  input SingleClimbInput {
    name: String!
    disciplines: DisciplineType
  }

  input DisciplineType {
    "https://en.wikipedia.org/wiki/Traditional_climbing"
    trad: Boolean
    "https://en.wikipedia.org/wiki/Sport_climbing"
    sport: Boolean
    "https://en.wikipedia.org/wiki/Bouldering"
    bouldering: Boolean
    "https://en.wikipedia.org/wiki/Alpine_climbing"
    alpine: Boolean
    "https://en.wikipedia.org/wiki/Ice_climbing"
    snow: Boolean
    "https://en.wikipedia.org/wiki/Ice_climbing"
    ice: Boolean
    mixed: Boolean
    "https://en.wikipedia.org/wiki/Aid_climbing"
    aid: Boolean
    "https://en.wikipedia.org/wiki/Top_rope_climbing"
    tr: Boolean
  }
`

export default ClimbEditTypeDefs
