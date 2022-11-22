import { MongoDataSource } from 'apollo-datasource-mongodb'
import muid from 'uuid-mongodb'

import { getMediaModel } from '../db/index.js'
import { MediaType, MediaListByAuthorType } from '../db/MediaTypes.js'

export default class AreaDataSource extends MongoDataSource<MediaType> {
  async getTagsByMediaIds (uuidList: string[]): Promise<any[]> {
    if (uuidList !== undefined && uuidList.length > 0) {
      const muidList = uuidList.map(entry => muid.from(entry))
      const rs = await getMediaModel()
        .find({ mediaUuid: { $in: muidList } })
        .populate('climb')
        .populate('area')
        .lean({ virtual: true })
      return rs // type: TagEntryResultType
    }
    return []
  }

  async getRecentTags (userLimit: number = 10): Promise<MediaListByAuthorType[]> {
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
