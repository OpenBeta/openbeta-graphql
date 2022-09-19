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

  type Mutation {
    editArea(input AreEditableFieldsInput): Area
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
    parentUuid: ID
    countryCode: String
    isDestination: Boolean
  }

  input RemoveAreaInput {
    uuid: String!
  }

  input AreEditableFieldsInput {
    uuid: String!
    areaName: String
    isDestination: Boolean
    shortCode: String
    lat: Number
    lng: Number
    description: String
  }
`

export default AreaEditTypeDefs
