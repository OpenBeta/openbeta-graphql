import { TagsLeaderboardType } from '../../db/MediaTypes.js'
import { MediaObject, MediaByUsers } from '../../db/MediaObjectType.js'
import { DataSourcesType } from '../../types.js'

const MediaQueries = {

  getRecentTags: async (_, { maxUsers = 10, maxFiles = 20 }: { maxUsers?: number, maxFiles?: number }, { dataSources }): Promise<MediaByUsers[]> => {
    const { media }: DataSourcesType = dataSources
    return await media.getMediaByUsers({ maxUsers, maxFiles })
  },

  getUserMedia: async (_, { userUuid, maxFiles = 1000 }: { maxFiles: number | undefined, userUuid: string }, { dataSources }): Promise<MediaObject[]> => {
    const { media }: DataSourcesType = dataSources
    return await media.getOneUserMedia(userUuid, maxFiles)
  },

  getTagsLeaderboard: async (_, { limit = 30 }: { limit: number }, { dataSources }): Promise<TagsLeaderboardType> => {
    const { media }: DataSourcesType = dataSources
    return await media.getTagsLeaderboard(limit)
  }
}

export default MediaQueries
