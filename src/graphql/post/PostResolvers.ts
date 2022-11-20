import { PostType } from '../../db/PostTypes'

const PostResolvers = {
  CreatePostResult: {
    createdAt: (node: PostType) => node.createdAt
  }
}

export default PostResolvers
