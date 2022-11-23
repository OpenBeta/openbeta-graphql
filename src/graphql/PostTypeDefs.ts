import { gql } from 'apollo-server'

export const typeDef = gql`
  type Mutation {
    createPost(input: PostInput): CreatePostResult
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
    destinationIds: [String]!
  }

  type CreatePostResult {
    createdAt: String
  }
`
