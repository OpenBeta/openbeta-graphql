import { MongoDataSource } from 'apollo-datasource-mongodb'
import { PostType } from '../db/PostTypes'
import { getPostModel } from '../db/index'

/**
 * Not being used at the moment
 */
export default class PostDataSource extends MongoDataSource<PostType> {
  postModel = getPostModel()

  /**
   * @param post
   * takes in a new post
   * @returns
   * returns that new post
   */
  async addPost ({
    userId,
    xMedia,
    description
  }: PostType): Promise<PostType | null> {
    try {
      const doc: PostType = {
        userId,
        xMedia,
        description
      }

      const res: PostType = await this.postModel.create({ ...doc })
      return res
    } catch (ex) {
      console.error('Failed to add post:', ex)
      return null
    }
  }

  // Delete Post

  // Edit Post
}
