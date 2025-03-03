import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { TagsLeaderboardType, MediaObject, MediaByUsers, UserMediaQueryInput, AreaMediaQueryInput, ClimbMediaQueryInput, MediaForFeedInput } from '../../db/MediaObjectTypes.js'
import { GQLContext } from '../../types.js'

const MediaQueries = {

  media: async (_: any, { input }, { dataSources }: GQLContext): Promise<MediaObject> => {
    const { media } = dataSources
    const id = new mongoose.Types.ObjectId(input.id)
    return await media.getOneMediaObjectById(id)
  },

  getMediaForFeed: async (_, { input }, { dataSources }: GQLContext): Promise<MediaByUsers[]> => {
    const { media } = dataSources
    const { maxUsers = 10, maxFiles = 20 } = input as MediaForFeedInput
    return await media.getMediaByUsers({ maxUsers, maxFiles })
  },

  getUserMedia: async (_: any, { input }, { dataSources }: GQLContext): Promise<MediaObject[]> => {
    const { media } = dataSources
    const { userUuid, maxFiles = 1000 } = input as UserMediaQueryInput
    return await media.getOneUserMedia(userUuid.toString(), maxFiles)
  },

  getUserMediaPagination: async (_: any, { input }, { dataSources }: GQLContext): Promise<any> => {
    const { media } = dataSources
    const { userUuid } = input as UserMediaQueryInput
    return await media.getOneUserMediaPagination({ ...input, userUuid: muuid.from(userUuid) })
  },

  areaMediaPagination: async (_: any, { input }, { dataSources }: GQLContext): Promise<any> => {
    const { media } = dataSources
    const { areaUuid } = input as AreaMediaQueryInput
    return await media.getOneAreaMediaPagination({ ...input, areaUuid: muuid.from(areaUuid) })
  },

  climbMediaPagination: async (_: any, { input }, { dataSources }: GQLContext): Promise<any> => {
    const { media } = dataSources
    const { climbUuid } = input as ClimbMediaQueryInput
    return await media.getOneClimbMediaPagination({ ...input, climbUuid: muuid.from(climbUuid) })
  },

  getTagsLeaderboard: async (_, { limit = 30 }: { limit: number }, { dataSources }: GQLContext): Promise<TagsLeaderboardType> => {
    const { media } = dataSources
    return await media.getTagsLeaderboard(limit)
  }
}

export default MediaQueries
