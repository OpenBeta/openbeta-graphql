import { gql } from 'apollo-server'

const AreaEditTypeDefs = gql`
  type Mutation {
    setDestinationFlag(input: DestinationFlagInput): Area
  }

  type Mutation {
    addCountry(input: CountryInput): Area
  }

  type Mutation {
    addArea(input: AreaInput): Area
  }

  type Mutation {
    removeArea(input: RemoveAreaInput): Area
  }

  input DestinationFlagInput {
    id: ID!
    flag: Boolean!
  }

  input CountryInput {
    alpha3ISOCode: String
  }

  input AreaInput {
    name: String!
    parentUuid: ID!
    isDestination: Boolean
  }

  input RemoveAreaInput {
    uuid: String!
  }
`

export default AreaEditTypeDefs
