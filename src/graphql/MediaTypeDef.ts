import { gql } from 'apollo-server'

export const typeDef = gql`
  type Mutation {
    setTags(input: MediaInput): MediaType
  }

  type Query {
    getTags(uuid: ID): MediaType
  }

  "A climbing route or a boulder problem"
  type MediaType {
    id: ID!
    lat: Float
    lng: Float
    mediaId: ID!
    mediaUrl: String!
    mediaType: Int!
    sources: [SourceType]
  }

  type SourceType {
    srcUuid: ID! 
    srcType: Int!
  }

  input MediaInput {
    lat: Float
    lng: Float
    mediaId: ID!
    mediaUrl: String!
    mediaType: Int!
    sources: [SourceInputType]
  }

  input SourceInputType {
    srcUuid: ID! 
    srcType: Int!
  }
`
