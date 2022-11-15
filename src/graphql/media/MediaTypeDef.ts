import { gql } from 'apollo-server'

/**
 * For custom scalars see common/*Scalar.ts
 */
export const typeDef = gql`
  type Mutation {
    setTag(input: MediaInput): TagEntryResult
  }

  type Mutation {
    removeTag(mediaUuid: MUID!, destinationId: MUID!): DeleteTagResult
  }

  type Query {
    getTagsByMediaIdList(uuidList: [ID]): [TagEntryResult]
  }

  type Query {
    getRecentTags(userLimit: Int): [MediaListByAuthorType]
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
    mediaUuid: MUID!
    mediaUrl: String!
    mediaType: Int!
    climb: Climb!
    destType: Int!
  }

  "A tag linking the media with an area"
  type AreaTag {
    mediaUuid: MUID!
    mediaUrl: String!
    mediaType: Int!
    area: Area!
    destType: Int!
  }

  union TagEntryResult = ClimbTag | AreaTag

  type MediaListByAuthorType {
    authorUuid: ID!
    tagList: [MediaTagType]
  }

  type DeleteTagResult {
    mediaUuid: MUID!
    destinationId: MUID!
    removed: Boolean!
  }

  input MediaInput {
    mediaUuid: MUID!
    mediaUrl: String!
    mediaType: Int!
    destinationId: MUID! 
    destType: Int!
  }
`
