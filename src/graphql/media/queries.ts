import { MediaListByAuthorType } from '../../db/MediaTypes.js'
import { DataSourcesType } from '../../types.js'

const MediaQueries = {

  /**
   * Given a list of media IDs return all tags.
   */
  getTagsByMediaIdList: async (_, { uuidList }: {uuidList: string[]}, { dataSources }) => {
    const { media }: DataSourcesType = dataSources
    return await media.getTagsByMediaIds(uuidList)
  },

  /**
   * Return most recent tags
   */
  getRecentTags: async (_, { userLimit = 10 }: {userLimit: number | undefined}, { dataSources }): Promise<MediaListByAuthorType[]> => {
    const { media }: DataSourcesType = dataSources
    return await media.getRecentTags(userLimit)
  }
}

export default MediaQueries
