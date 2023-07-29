import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { TagsLeaderboardType, MediaObject, MediaByUsers, UserMediaGQLQueryInput, MediaForFeedInput } from '../../db/MediaObjectTypes.js'
import { Context } from '../../types.js'

const MediaQueries = {

  media: async (_: any, { input }, { dataSources }: Context): Promise<MediaObject> => {
    const { media } = dataSources
    const id = new mongoose.Types.ObjectId(input.id)
    return await media.getOneMediaObjectById(id)
  },

  getMediaForFeed: async (_, { input }, { dataSources }: Context): Promise<MediaByUsers[]> => {
    const { media } = dataSources
    const { maxUsers = 10, maxFiles = 20 } = input as MediaForFeedInput
    return await media.getMediaByUsers({ maxUsers, maxFiles })
  },

  getUserMedia: async (_: any, { input }, { dataSources }: Context): Promise<MediaObject[]> => {
    const { media } = dataSources
    const { userUuid, maxFiles = 1000 } = input as UserMediaGQLQueryInput
    return await media.getOneUserMedia(userUuid, maxFiles)
  },

  getUserMediaPagination: async (_: any, { input }, { dataSources }: Context): Promise<any> => {
    const { media } = dataSources
    const { userUuid } = input as UserMediaGQLQueryInput
    return await media.getOneUserMediaPagination({ ...input, userUuid: muuid.from(userUuid) })
  },

  getTagsLeaderboard: async (_, { limit = 30 }: { limit: number }, { dataSources }: Context): Promise<TagsLeaderboardType> => {
    const { media } = dataSources
    return await media.getTagsLeaderboard(limit)
  }
}

export default MediaQueries
