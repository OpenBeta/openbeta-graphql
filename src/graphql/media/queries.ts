import muid from 'uuid-mongodb'
import { getMediaModel } from '../../db/index.js'
import { MediaListByAuthorType } from '../../db/MediaTypes.js'

const MediaQueries = {

  getTagsByMediaIdList: async (_, { uuidList }: {uuidList: string[]}) => {
    if (uuidList !== undefined && uuidList.length > 0) {
      const muidList = uuidList.map(entry => muid.from(entry))
      const rs = await getMediaModel()
        .find({ mediaUuid: { $in: muidList } })
        .populate('destinationId').lean()
      return rs
    }
    return []
  },

  getRecentTags: async (_, { userLimit = 10 }: {userLimit: number | undefined}): Promise<MediaListByAuthorType[]> => {
    const rs = await getMediaModel().aggregate<MediaListByAuthorType>([
      {
        $project: {
          mediaUuid: 1,
          mediaUrl: 1,
          mediaType: 1,
          destinationId: 1,
          destType: 1,
          onModel: 1,
          authorUuid: { $substr: ['$mediaUrl', 3, 36] }
        }
      },
      {
        $group: {
          _id: '$authorUuid',
          mediaList: { $push: '$$ROOT' }
        }
      },
      {
        $limit: userLimit // limit the number of authors
      },
      {
        $unwind: '$mediaList'
      },
      {
        $unset: 'mediaList.authorUuid'
      },
      {
        $sort: { 'mediaList._id': -1 }
      },
      {
        $group: {
          _id: '$_id',
          tagList: { $push: '$mediaList' }
        }
      }
    ])
    return rs
  }
}

export default MediaQueries
