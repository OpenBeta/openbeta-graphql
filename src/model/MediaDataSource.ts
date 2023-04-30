import { MongoDataSource } from 'apollo-datasource-mongodb'
import muid, { MUUID } from 'uuid-mongodb'

import { getMediaModel, getMediaObjectModel } from '../db/index.js'
import { MediaType, MediaListByAuthorType, TagsLeaderboardType, MediaWithTags } from '../db/MediaTypes.js'

export default class MediaDataSource extends MongoDataSource<MediaType> {
  tagModel = getMediaModel()
  mediaObjectModel = getMediaObjectModel()

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
          from: this.mediaObjectModel.modelName, // Foreign collection name
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
  async getUserMedia (uuidStr: string, userLimit: number = 10): Promise<MediaWithTags[]> {
    const rs = await getMediaObjectModel().aggregate<MediaWithTags>([
      {
        $match: {
          $expr: {
            $eq: [{ $substr: ['$mediaUrl', 3, 36] }, uuidStr]
          }
        }
      },
      {
        $lookup: {
          localField: 'mediaUrl',
          from: 'media', // Foreign collection name
          foreignField: 'mediaUrl',
          as: 'climbTags', // add a new parent field
          pipeline: [
            {
              $match: { destType: 0 }
            },
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
                'climb.name': '$taggedClimbs.name',
                'climb.type': 0
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
          localField: 'mediaUrl',
          from: 'media', // Foreign collection name
          foreignField: 'mediaUrl',
          as: 'areaTags', // add a new parent field
          pipeline: [
            {
              $match: { destType: 1 }
            },
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
                'area.name': '$taggedAreas.area_name',
                'area.type': 1
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

  /**
   * Find tags for a given climb id.
   *
   * SQL equivalent:
   * ```
   * select *
   * from media, media_objects
   * where media.mediaUrl == media_objects.name and media.estinationId == <climb id>
   * ```
   * @param climbId
   * @returns `MediaWithTags` array
   */
  async findMediaByClimbId (climbId: MUUID, climbName: string): Promise<MediaWithTags[]> {
    const rs = await this.tagModel
      .aggregate<MediaWithTags>([
      { $match: { destinationId: climbId } },
      ...joiningTagWithMediaObject,
      {
        $unset: ['onModel', 'mediaType', 'destType', 'destinationId']
      }
    ])
    return rs.map(media => ({
      ...media,
      climbTags: [{
        id: climbId,
        name: climbName,
        type: 0
      }],
      areaTags: []
    }))
  }

  /**
   * Find all media tags associated with a given area.  An area can have its own
   * tags or inherit tags from their children.  A note on inheritance:
   *
   * 1.  A parent area and their ancestors will inherit tags from their children.
   * 2.  Child area or climb will **not** inherit their parent/ancestor tags.
   *
   * @param areaId
   * @param ancestors
   * @returns `UserMediaWithTags` array
   */
  async findMediaByAreaId (areaId: MUUID, ancestors: string): Promise<MediaWithTags[]> {
    const taggedClimbsPipeline = [
      {
        // SELECT *
        // FROM media
        // LEFT OUTER climbs
        // ON climbs._id == media.destinationId
        $lookup: {
          from: 'climbs', // other collection name
          foreignField: '_id', // climb._id
          localField: 'destinationId',
          as: 'taggedClimb',
          pipeline: [{
            $lookup: { // also allow ancestor areas to inherent climb photo
              from: 'areas', // other collection name
              foreignField: 'metadata.area_id',
              localField: 'metadata.areaRef', // climb.metadata.areaRef
              as: 'area'
            }
          },
          {
            $match: {
              'area.ancestors': { $regex: areaId.toUUID().toString() }
            }
          }
          ]
        }
      },
      {
        $set: {
          taggedClimb: {
            $map: {
              input: '$taggedClimb',
              in: {
                id: '$$this._id',
                name: '$$this.name',
                type: 0
              }
            }
          }
        }
      },
      {
        $unwind: {
          path: '$taggedClimb',
          preserveNullAndEmptyArrays: true
        }
      }
    ]

    const taggedAreasPipeline = [{
      // SELECT *
      // FROM media
      // LEFT JOIN areas
      // ON media.destinationId == areas.metadata.area_id
      $lookup: {
        from: 'areas', // other collection name
        foreignField: 'metadata.area_id',
        localField: 'destinationId',
        as: 'taggedArea',
        pipeline: [
          {
            $match: {
              $expr: {
                // Given an ancestor area, match descendant tags
                // - input: A,B,C  <-- Area C has a tag
                // - regex: A,B <-- My search area is B.  Yes, there's a match.
                $regexMatch: {
                  input: '$ancestors',
                  regex: ancestors,
                  options: 'i'
                }
              }
            }
          }]
      }
    },
    {
      $set: {
        taggedArea: {
          $map: {
            input: '$taggedArea',
            in: {
              id: '$$this.metadata.area_id',
              name: '$$this.area_name',
              type: 1
            }
          }
        }
      }
    },
    {
      $unwind: {
        path: '$taggedArea',
        preserveNullAndEmptyArrays: true
      }
    }
    ]

    /**
     * Find all area tags whose ancestors and children have 'areaId'
     */
    return await getMediaModel().aggregate<MediaWithTags>([
      ...joiningTagWithMediaObject,
      {
        $unset: ['_id', 'onModel', 'mediaType', 'destType', 'mediaUuid']
      },
      ...taggedClimbsPipeline,
      ...taggedAreasPipeline,
      {
        $unset: ['destinationId']
      },
      {
        $match: {
          $or: [
            {
              taggedClimb: {
                $exists: true
              }
            },
            {
              taggedArea: {
                $exists: true
              }
            }
          ]
        }
      },
      {
        $group: {
          _id: {
            mediaUrl: '$mediaUrl',
            width: '$width',
            height: '$height',
            birthTime: '$birthTime',
            mtime: '$mtime',
            format: '$format',
            size: '$size'
          },
          taggedAreas: { $push: '$taggedArea' },
          taggedClimbs: { $push: '$taggedClimb' }
        }
      },
      {
        $addFields: {
          '_id.areaTags': '$taggedAreas',
          '_id.climbTags': '$taggedClimbs'
        }
      },
      { $replaceRoot: { newRoot: '$_id' } }
    ])
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
      foreignField: 'mediaUrl',
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
