import { gql } from 'apollo-server'

export const typeDef = gql`
  type Mutation {
    createPost(input: PostInput): TagEntryResult
  }

  input PostInput {
    media: [mediaObject]
    createdAt: String!
    description: String
    userId: ID!
  }

  input mediaObject {
    mediaUuid: ID!
    mediaUrl: String!
    destinationId: String!
  }
`
