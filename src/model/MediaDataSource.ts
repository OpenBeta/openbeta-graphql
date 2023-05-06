import { MongoDataSource } from 'apollo-datasource-mongodb'
import muid, { MUUID } from 'uuid-mongodb'
import { logger } from '../logger.js'
import { getMediaObjectModel } from '../db/index.js'
import { TagsLeaderboardType, AllTimeTagStats } from '../db/MediaTypes.js'

import { MediaByUsers, MediaByUsersInput, MediaObject } from '../db/MediaObjectType.js'

export default class MediaDataSourcmnee extends MongoDataSource<MediaObject> {
  mediaObjectModel = getMediaObjectModel()

  entityTagsNotEmptyFilter = [{
    $match: {
      /**
       * exclude documents with empty entityTags
       */
      entityTags: { $exists: true, $type: 4, $ne: [] }
    }
  }]

  /**
   * Get all media & tags grouped by users
   * @param uuidStr optional user uuid to limit the search, otherwise include all users.
   * @param maxUsers limit the number of users.
   * @param maxFiles limit the number of files per user.
   * @param includesNoEntityTags By default the query exludes media without tags. Specify 'true' override this behavoir.
   * @returns MediaByUsers array
   */
  async getMediaByUsers ({ uuidStr, maxUsers = 10, maxFiles = 10, includesNoEntityTags = false }: MediaByUsersInput): Promise<MediaByUsers[]> {
    let userFilter: any[] = []
    if (uuidStr != null) {
      userFilter = [{
        $match: {
          userUuid: muid.from(uuidStr)
        }
      }]
    }

    const toIncludeMediaWithTagsOrNotfilters = includesNoEntityTags
      ? []
      : this.entityTagsNotEmptyFilter

    const rs = await this.mediaObjectModel.aggregate<MediaByUsers>([
      ...userFilter,
      ...toIncludeMediaWithTagsOrNotfilters,
      {
        /**
         * Sort by most recently uploaded media first
         */
        $sort: { _id: -1 }
      },
      {
        $group: {
          _id: {
            userUuid: '$userUuid'
          },
          mediaWithTags: { $push: '$$ROOT' }
        }
      },
      {
        $limit: maxUsers
      },
      {
        $project: {
          _id: 0,
          userUuid: '$_id.userUuid',
          mediaWithTags: {
            $slice: ['$mediaWithTags', maxFiles]
          }
        }
      }
    ])
    return rs
  }

  /**
   * Get all media belonging to a user
   * @param userLimit
   */
  async getOneUserMedia (uuidStr: string, limit: number): Promise<MediaObject[]> {
    const rs = await this.getMediaByUsers({ uuidStr, maxUsers: 1, maxFiles: limit, includesNoEntityTags: true })
    if (rs.length !== 1) {
      logger.error('Expecting 1 user in result set but got ', rs.length)
      return []
    }
    return rs[0].mediaWithTags
  }

  /**
   * Get a list of users and their tagged photo count
   * @param limit how many entries
   * @returns Array of TagsLeaderboardType
   */
  async getTagsLeaderboard (limit = 30): Promise<TagsLeaderboardType> {
    const rs = await this.mediaObjectModel.aggregate<AllTimeTagStats>([
      ...this.entityTagsNotEmptyFilter,
      {
        $group: {
          _id: '$userUuid',
          total: { $count: {} }
        }
      },
      {
        /**
         * Sort by media count descending
         */
        $sort: { total: -1 }
      },
      {
        $project: {
          _id: 0,
          userUuid: '$_id',
          total: 1
        }
      },
      {
        $group: {
          _id: null,
          totalMediaWithTags: { $sum: '$$ROOT.total' },
          byUsers: { $push: '$$ROOT' }
        }
      },
      {
        $unset: ['_id']
      }
    ], {
      /**
       * Read from secondary node since data freshness is not too important
       * See https://www.mongodb.com/docs/manual/core/read-preference/
       */
      readPreference: 'secondaryPreferred'
    })

    if (rs?.length !== 1) throw new Error('Unexpected leaderboard query error')

    return {
      allTime: rs[0]
    }
  }

  /**
   * Find tags associated with a given climb id.
   *
   * @param climbId
   * @returns `MediaWithTags` array
   */
  async findMediaByClimbId (climbId: MUUID, climbName: string): Promise<MediaObject[]> {
    const rs = await this.mediaObjectModel.find({
      'entityTags.targetId': climbId
    }).lean()
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
  async findMediaByAreaId (areaId: MUUID, ancestors: string): Promise<MediaObject[]> {
    const rs = await this.mediaObjectModel.find({
      'entityTags.ancestors': { $regex: areaId.toUUID().toString() }
    }).lean()
    return rs
  }
}
