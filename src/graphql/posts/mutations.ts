import { AddPostInputType, RemovePostInputType } from '../../db/PostTypes'
import { getPostModel } from '../../db/PostSchema.js'

const PostMutations = {
  // addPost
  addPost: async (_: any, { input }: {input: AddPostInputType}) => {
    const { userId, mediaIds, description }: AddPostInputType = input

    const PostModel = getPostModel()
    const newPost = new PostModel({
      mediaIds,
      description,
      userId
    })
    const res = await PostModel.create(newPost)

    return { postId: res.id }
  },

  // removePost
  removePost: async (_: any, { input }: {input: RemovePostInputType}) => {
    const PostModel = getPostModel()
    const res = await PostModel.deleteOne({ _id: input.postId })
    return { numDeleted: res.deletedCount }
  }
}

export default PostMutations
