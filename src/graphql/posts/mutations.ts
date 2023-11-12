import { AddPostInputType, RemovePostInputType } from '../../db/PostTypes'
import { getPostModel } from '../../db/PostSchema'
import { Context } from '../../types'
import muid from 'uuid-mongodb'
import { XMediaType } from '../../db/XMediaTypes'

const PostMutations = {
  // addPost
  addPost: async (
    _: any,
    { input }: { input: AddPostInputType },
    { dataSources }: Context
  ) => {
    const { xmedia, post } = dataSources
    const { userId, description, photoUrls }: AddPostInputType = input
    const userMMUID = muid.from(userId)
    // Create new XMedia documents
    const xMedia: XMediaType[] = []
    for (const photoUrl of photoUrls) {
      try {
        const newXMedia = await xmedia.addXMedia({
          userId: userMMUID,
          mediaType: 0, // TODO: Get mediaType from input. For now only accept mediaType=0 (photos)
          mediaUrl: photoUrl
        })

        if (newXMedia == null) {
          console.error(`Failed to add xMedia for photoURL ${photoUrl}`)
        } else {
          xMedia.push(newXMedia)
        }
      } catch (ex) {
        console.error('Error adding XMedia in addPost method: ', ex)
      }
    }

    // Create new Post
    try {
      const newPost = await post.addPost({
        userId: userMMUID,
        xMedia,
        description
      })
      return {
        userId: newPost?.userId,
        xMedia: newPost?.xMedia,
        description: newPost?.description
      }
    } catch (ex) {
      console.error('Error adding new Post', ex)
      return ex
    }
  },

  // removePost
  removePost: async (_: any, { input }: { input: RemovePostInputType }) => {
    const PostModel = getPostModel()
    const res = await PostModel.deleteOne({ _id: input.postId })
    return { numDeleted: res.deletedCount }
  }
}

export default PostMutations
