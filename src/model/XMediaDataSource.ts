import { MongoDataSource } from 'apollo-datasource-mongodb'
import { XMediaType } from '../db/XMediaTypes'
import { getXMediaModel } from '../db/index.js'

export default class XMediaDataSource extends MongoDataSource<XMediaType> {
  xMediaModel = getXMediaModel()

  /**
   * @param xMedia
   * takes in a new xMedia
   * @returns
   * returns that new xMedia
   */
  async addXMedia ({
    userId,
    mediaType,
    mediaUrl
  }: XMediaType): Promise<XMediaType | null> {
    try {
      const doc: XMediaType = {
        userId,
        mediaType,
        mediaUrl
      }

      const res: XMediaType = await this.xMediaModel.create({ ...doc })
      return res
    } catch (ex) {
      console.error('Failed to add XMedia:', ex)
      return null
    }
  }

  // Delete XMedia

  // Edit XMedia
}
