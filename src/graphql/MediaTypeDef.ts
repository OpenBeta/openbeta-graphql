import { gql } from 'apollo-server'

export const typeDef = gql`
  type Mutation {
    setTag(input: MediaInput): TagEntryResult
  }

  type Mutation {
    removeTag(mediaUuid: ID!, destinationId: ID!): DeleteTagResult
  }

  type Query {
    getTagsByMediaIdList(uuidList: [ID]): [TagEntryResult]
  }

  "A tag linking the media with a climb or an area"
  type MediaTagType {
    mediaUuid: ID!
    mediaUrl: String!
    mediaType: Int!
    destination: ID!
    destType: Int!
  }

  "A tag linking the media with a climb"
  type ClimbTag {
    mediaUuid: ID!
    mediaUrl: String!
    mediaType: Int!
    climb: Climb!
    destType: Int!
  }

  "A tag linking the media with an area"
  type AreaTag {
    mediaUuid: ID!
    mediaUrl: String!
    mediaType: Int!
    area: Area!
    destType: Int!
  }

  union TagEntryResult = ClimbTag | AreaTag

  type DeleteTagResult {
    mediaUuid: ID!
    destinationId: ID!
    removed: Boolean!
  }

  input MediaInput {
    mediaUuid: ID!
    mediaUrl: String!
    mediaType: Int!
    destinationId: ID! 
    destType: Int!
  }
`
