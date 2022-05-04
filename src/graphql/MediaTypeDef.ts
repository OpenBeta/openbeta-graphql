import { gql } from 'apollo-server'

export const typeDef = gql`
  type Mutation {
    setTags(input: MediaInput): MediaType
  }

  type Query {
    getTagsByMediaId(uuid: ID): MediaType
  }

  type Query {
    getTagsByMediaIdList(uuidList: [ID]): [TagType]
  }

  type TagType {
    areaUuid: ID!
    areaName: String!
    climb: ClimbType!
    mediaList: [MediaType!]!
  }

  "A climbing route or a boulder problem"
  type MediaType {
    lat: Float
    lng: Float
    mediaUuid: ID!
    mediaUrl: String!
    mediaType: Int!
    srcUuid: ID! 
    srcType: Int!
  }

  type ClimbType {
    uuid: ID!
    name: String!
    yds: String!
    type: ClimbType!
    safety: SafetyEnum!
    metadata: ClimbMetadata!
    ancestors: [String!]!
  }

  input MediaInput {
    mediaUuid: ID!
    mediaUrl: String!
    mediaType: Int!
    srcUuid: ID! 
    srcType: Int!
  }
`
