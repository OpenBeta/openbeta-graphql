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
  }
`

export default ClimbEditTypeDefs
