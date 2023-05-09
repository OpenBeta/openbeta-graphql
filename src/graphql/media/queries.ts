import { TagsLeaderboardType, MediaObject, MediaByUsers, UserMediaQueryInput, MediaForFeedInput } from '../../db/MediaObjectTypes.js'
import { DataSourcesType } from '../../types.js'

const MediaQueries = {

  getMediaForFeed: async (_, { input }, { dataSources }): Promise<MediaByUsers[]> => {
    const { media }: DataSourcesType = dataSources
    const { maxUsers = 10, maxFiles = 20 } = input as MediaForFeedInput
    return await media.getMediaByUsers({ maxUsers, maxFiles })
  },

  getUserMedia: async (_: any, { input }, { dataSources }): Promise<MediaObject[]> => {
    const { media }: DataSourcesType = dataSources
    const { userUuid, maxFiles = 1000 } = input as UserMediaQueryInput
    return await media.getOneUserMedia(userUuid, maxFiles)
  },

  getTagsLeaderboard: async (_, { limit = 30 }: { limit: number }, { dataSources }): Promise<TagsLeaderboardType> => {
    const { media }: DataSourcesType = dataSources
    return await media.getTagsLeaderboard(limit)
  }
}

export default MediaQueries
