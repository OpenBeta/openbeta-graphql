import { gql } from 'apollo-server'

export const typeDef = gql`
  type Mutation {
    setTags(input: MediaInput): MediaTagType
  }

  type Mutation {
    removeTag(mediaUuid: ID!, destinationId: ID!): Boolean
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

  input MediaInput {
    mediaUuid: ID!
    mediaUrl: String!
    mediaType: Int!
    destinationId: ID! 
    destType: Int!
  }
`

// type ClimbType {
//   uuid: ID!
//   name: String!
//   yds: String!
//   type: ClimbType!
//   safety: SafetyEnum!
//   metadata: ClimbMetadata!
//   ancestors: [String!]!
// }
