import { getPostModel } from '../../db/PostSchema.js'
import { GetPostsInputType } from '../../db/PostTypes'

const PostQueries = {
  // Given a list of postIDs, return a list of post documents.
  getPosts: async (_, { input }: {input: GetPostsInputType}) => {
    const PostModel = getPostModel()
    const posts = await PostModel.find({ _id: { $in: input.postIds } })
    return { posts }
  }
}

export default PostQueries
