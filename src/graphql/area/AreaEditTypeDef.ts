import { gql } from 'apollo-server'

const AreaEditTypeDefs = gql`
  type Mutation {
    setDestinationFlag(input: DestinationFlagInput): Area
  }

  type Mutation {
    addCountry(input: CountryInput): Area
  }

  input DestinationFlagInput {
    id: ID!
    flag: Boolean!
  }

  input CountryInput {
    isoCode: String
  }
`

export default AreaEditTypeDefs
