import { TagsLeaderboardType, MediaObject, MediaByUsers, UserMediaQueryInput, MediaForFeedInput } from '../../db/MediaObjectTypes.js'
import { Context } from '../../types.js'

const MediaQueries = {

  getMediaForFeed: async (_, { input }, { dataSources }: Context): Promise<MediaByUsers[]> => {
    const { media } = dataSources
    const { maxUsers = 10, maxFiles = 20 } = input as MediaForFeedInput
    return await media.getMediaByUsers({ maxUsers, maxFiles })
  },

  getUserMedia: async (_: any, { input }, { dataSources }: Context): Promise<MediaObject[]> => {
    const { media } = dataSources
    const { userUuid, maxFiles = 1000 } = input as UserMediaQueryInput
    return await media.getOneUserMedia(userUuid, maxFiles)
  },

  getUserMediaPagination: async (_: any, { input }, { dataSources }: Context): Promise<any> => {
    const { media } = dataSources
    return await media.getOneUserMediaPagination(input as UserMediaQueryInput)
  },

  getTagsLeaderboard: async (_, { limit = 30 }: { limit: number }, { dataSources }: Context): Promise<TagsLeaderboardType> => {
    const { media } = dataSources
    return await media.getTagsLeaderboard(limit)
  }
}

export default MediaQueries
