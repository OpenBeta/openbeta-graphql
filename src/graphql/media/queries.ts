import { MediaByUsers, MediaWithTags, TagsLeaderboardType } from '../../db/MediaTypes.js'
import { DataSourcesType } from '../../types.js'

const MediaQueries = {

  /**
   * Given a list of media IDs return all tags.
   */
  getTagsByMediaIdList: async (_, { uuidList }: { uuidList: string[] }, { dataSources }) => {
    const { media }: DataSourcesType = dataSources
    return await media.getTagsByMediaIds(uuidList)
  },

  /**
   * Return most recent tags
   */
  getRecentTags: async (_, { userLimit = 10 }: { userLimit: number | undefined }, { dataSources }): Promise<MediaByUsers[]> => {
    const { media }: DataSourcesType = dataSources
    return await media.getRecentTags(userLimit)
  },

  /**
   * Return most recent tags
   */
  getUserMedia: async (_, { userUuid, limit = 1000 }: { limit: number | undefined, userUuid: string }, { dataSources }): Promise<MediaWithTags[]> => {
    const { media }: DataSourcesType = dataSources
    return await media.getUserMedia(userUuid, limit)
  },

  getTagsLeaderboard: async (_, { limit = 30 }: { limit: number }, { dataSources }): Promise<TagsLeaderboardType[]> => {
    const { media }: DataSourcesType = dataSources
    return await media.getTagsLeaderboard(limit)
  }
}

export default MediaQueries
