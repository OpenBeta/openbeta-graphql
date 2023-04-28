import { MongoDataSource } from 'apollo-datasource-mongodb'
import muid from 'uuid-mongodb'

import { getMediaModel, getMediaObjectModel } from '../db/index.js'
import { MediaType, MediaListByAuthorType, TagsLeaderboardType, UserMediaWithTags } from '../db/MediaTypes.js'

export default class MediaDataSource extends MongoDataSource<MediaType> {
  tagModel = getMediaModel()
  mediaMediaObjectModel = getMediaObjectModel()

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
    const rs = await this.tagModel.aggregate<MediaListByAuthorType>([
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
        $lookup: {
          localField: 'mediaUrl',
          from: this.mediaMediaObjectModel.modelName, // Foreign collection name
          foreignField: 'name',
          as: 'meta' // add a new parent field
        }
      },
      { $unwind: '$meta' },
      {
        $unset: ['meta.name', 'meta._id', 'meta.createdAt', 'meta.updatedAt']
      },
      {
        $replaceWith: {
          $mergeObjects: ['$$ROOT', '$meta']
        }
      },
      {
        $unset: ['meta']
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

  /**
   * Get all photos for a user
   * @param userLimit
   */
  async getUserPhotos (uuidStr: string, userLimit: number = 10): Promise<UserMediaWithTags[]> {
    // const list = await getUserMedia(uuidStr)
    // console.log('#list', list)

    const rs = await getMediaObjectModel().aggregate<UserMediaWithTags>([
      {
        $match: {
          $expr: {
            $eq: [{ $substr: ['$name', 3, 36] }, uuidStr]
          }
        }
      },
      {
        $lookup: {
          localField: 'name',
          from: 'media', // Foreign collection name
          foreignField: 'mediaUrl',
          as: 'climbTags', // add a new parent field
          pipeline: [
            {
              $lookup: {
                from: 'climbs', // other collection name
                foreignField: '_id', // climb._id
                localField: 'destinationId',
                as: 'taggedClimbs'
              }

            },
            {
              $unwind: '$taggedClimbs'
            },
            {
              $set: {
                'climb.id': '$taggedClimbs._id',
                'climb.name': '$taggedClimbs.name'
              }
            },
            {
              $unset: 'taggedClimbs'
            },
            { $replaceRoot: { newRoot: '$climb' } }
          ]
        }
      },
      {
        $lookup: {
          localField: 'name',
          from: 'media', // Foreign collection name
          foreignField: 'mediaUrl',
          as: 'areaTags', // add a new parent field
          pipeline: [
            {
              $lookup: {
                from: 'areas', // other collection name
                foreignField: 'metadata.area_id', // climb._id
                localField: 'destinationId',
                as: 'taggedAreas'
              }

            },
            {
              $unwind: '$taggedAreas'
            },
            {
              $set: {
                'area.id': '$taggedAreas.metadata.area_id',
                'area.name': '$taggedAreas.area_name'
              }
            },
            {
              $unset: 'taggedAreas'
            },
            { $replaceRoot: { newRoot: '$area' } }
          ]
        }
      }

    ]
    )
    return rs
  }

  /**
   * Get a list of users and their tagged photo count
   * @param limit how many entries
   * @returns Array of TagsLeaderboardType
   */
  async getTagsLeaderboard (limit = 30): Promise<TagsLeaderboardType[]> {
    const rs = await getMediaModel().aggregate([
      {
        $project: {
          mediaUuid: 1,
          authorUuid: { $substr: ['$mediaUrl', 3, 36] }
        }
      },
      {
        $group: {
          _id: '$authorUuid',
          uniqueCount: { $addToSet: '$mediaUuid' } //  A photo can have multiple tags. Use 'Set' to count multiple occurences once.
        }
      },
      {
        $project: {
          _id: 0,
          userUuid: '$_id',
          total: { $size: '$uniqueCount' }
        }
      },
      {
        $sort: { total: -1 }
      },
      {
        $limit: limit
      }])
    return rs
  }
}

/**
 * A reusable Mongo aggregation snippet for 'joining' tag collection and media object collection.
 * Ideally we should just embed tags as an array inside 'media_objects' collection to eliminate
 * this extra join.
 *
 * ```
 * select *
 * from media, media_objects
 * where media.mediaUrl == media_objects.name
 * ```
 */
export const joiningTagWithMediaObject = [
  {
    $lookup: {
      localField: 'mediaUrl',
      from: 'media_objects', // Foreign collection name
      foreignField: 'name',
      as: 'meta' // add a new parent field
    }
  },
  { $unwind: '$meta' },
  {
    $unset: ['meta.name', 'meta._id', 'meta.createdAt', 'meta.updatedAt']
  },
  {
    $replaceWith: {
      $mergeObjects: ['$$ROOT', '$meta']
    }
  },
  {
    $unset: ['meta']
  }]
