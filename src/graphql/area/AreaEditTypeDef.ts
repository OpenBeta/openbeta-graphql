import { gql } from 'apollo-server'

const AreaEditTypeDefs = gql`
  type Mutation {
    setDestinationFlag(input: DestinationFlagInput): Area
  }

  input DestinationFlagInput {
    id: ID!
    flag: Boolean!
  }
`

export default AreaEditTypeDefs
