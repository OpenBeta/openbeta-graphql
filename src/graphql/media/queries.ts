import { MediaByUsers, MediaWithTags, TagsLeaderboardType } from '../../db/MediaTypes.js'
import { DataSourcesType } from '../../types.js'

const MediaQueries = {

  getRecentTags: async (_, { userLimit = 10 }: { userLimit: number | undefined }, { dataSources }): Promise<MediaByUsers[]> => {
    const { media }: DataSourcesType = dataSources
    return await media.getRecentTags(userLimit)
  },

  getUserMedia: async (_, { userUuid, limit = 1000 }: { limit: number | undefined, userUuid: string }, { dataSources }): Promise<MediaWithTags[]> => {
    const { media }: DataSourcesType = dataSources
    return await media.getUserMedia(userUuid, limit)
  },

  getTagsLeaderboard: async (_, { limit = 30 }: { limit: number }, { dataSources }): Promise<TagsLeaderboardType> => {
    const { media }: DataSourcesType = dataSources
    return await media.getTagsLeaderboard(limit)
  }
}

export default MediaQueries
