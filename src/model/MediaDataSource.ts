import { MongoDataSource } from 'apollo-datasource-mongodb'
import muid, { MUUID } from 'uuid-mongodb'

import { getMediaModel, getMediaObjectModel } from '../db/index.js'
import { MediaType, MediaByUsers, TagsLeaderboardType, MediaWithTags } from '../db/MediaTypes.js'

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

  async getRecentTags (userLimit: number = 10): Promise<MediaByUsers[]> {
    const rs = await this.mediaObjectModel
      .aggregate<MediaByUsers>([
      {
        $match: { tags: { $ne: [] } }
      },
      {
        $sort: { 'tags._id': -1 }
      },
      {
        $lookup: {
          from: 'climbs', // Foreign collection name
          localField: 'tags.targetId',
          foreignField: '_id',
          as: 'taggedClimbs'
        }
      },
      {
        $set: {
          taggedClimbs: {
            $map: {
              input: '$taggedClimbs',
              in: {
                targetId: '$$this._id',
                name: '$$this.name',
                type: 0
              }
            }
          }
        }
      },
      {
        $unwind: {
          path: '$taggedClimbs',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'areas', // Foreign collection name
          localField: 'tags.targetId',
          foreignField: 'metadata.area_id',
          as: 'taggedAreas'
        }
      },
      {
        $set: {
          taggedAreas: {
            $map: {
              input: '$taggedAreas',
              in: {
                targetId: '$$this.metadata.area_id',
                name: '$$this.area_name',
                type: 1
              }
            }
          }
        }
      },
      {
        $unwind: {
          path: '$taggedAreas',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unset: ['tags'] // drop the raw tags
      },
      {
        $match: {
          $or: [
            {
              taggedClimbs: {
                $exists: true
              }
            },
            {
              taggedAreas: {
                $exists: true
              }
            }
          ]
        }
      },
      {
        $group: {
          _id: {
            userUuid: '$userUuid',
            mediaUrl: '$mediaUrl',
            width: '$width',
            height: '$height',
            birthTime: '$birthTime',
            mtime: '$mtime',
            format: '$format',
            size: '$size'
          },
          taggedAreas: { $push: '$taggedAreas' },
          taggedClimbs: { $push: '$taggedClimbs' }
        }
      },
      {
        $addFields: {
          '_id.areaTags': '$taggedAreas',
          '_id.climbTags': '$taggedClimbs'
        }
      },
      { $replaceRoot: { newRoot: '$_id' } },
      {
        $group: {
          _id: {
            userUuid: '$userUuid'
          },
          mediaWithTags: { $push: '$$ROOT' }
        }
      },
      {
        $addFields: { '_id.mediaWithTags': '$mediaWithTags' }
      },
      {
        $replaceRoot: { newRoot: '$_id' }
      },
      {
        $limit: userLimit
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
   * Find tags associated with a given climb id.
   *
   * @param climbId
   * @returns `MediaWithTags` array
   */
  async findMediaByClimbId (climbId: MUUID, climbName: string): Promise<MediaWithTags[]> {
    const rs = await this.mediaObjectModel
      .aggregate<MediaWithTags>([
      { $match: { 'tags.targetId': climbId } },
      {
        $lookup: {
          from: 'climbs', // Foreign collection name
          foreignField: '_id',
          localField: 'tags.targetId',
          as: 'climbTags'
        }
      },
      {
        $set: {
          climbTags: {
            $map: {
              input: '$climbTags',
              in: {
                targetId: '$$this._id',
                name: '$$this.name',
                type: 0
              }
            }
          }
        }
      },
      {
        $unset: ['tags']
      }
    ])

    return rs
  }

  /**
   * Find all media tags associated with an area.  An area can have its own
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
        $lookup: {
          from: 'climbs', // other collection name
          foreignField: '_id', // climb._id
          localField: 'tags.targetId',
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
                targetId: '$$this._id',
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

    const taggedAreasPipeline = [
      {
        $lookup: {
          from: 'areas', // other collection name
          foreignField: 'metadata.area_id',
          localField: 'tags.targetId',
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
                targetId: '$$this.metadata.area_id',
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
    const rs = await this.mediaObjectModel.aggregate<MediaWithTags>([
      {
        /**
         * Only work with media objects with tags
         */
        $match: {
          tags: { $ne: [] }
        }
      },
      ...taggedClimbsPipeline,
      ...taggedAreasPipeline,
      {
        $unset: ['tags'] // drop the raw tags
      },
      {
        /**
         * Only include documents with either climb or area tags
         */
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
        /**
         * Group documents by media fields to restore its original shape,
         * one media has many tags.
         */
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
        /**
         * Move tag fields inside nested '_id'
         */
        $addFields: {
          '_id.areaTags': '$taggedAreas',
          '_id.climbTags': '$taggedClimbs'
        }
      },
      {
        /**
         * make '_id' the new document root
         */
        $replaceRoot: { newRoot: '$_id' }
      }
    ])

    return rs
  }
}
