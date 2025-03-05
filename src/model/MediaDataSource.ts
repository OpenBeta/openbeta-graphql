import { MongoDataSource } from 'apollo-datasource-mongodb'
import muid, { MUUID } from 'uuid-mongodb'
import mongoose from 'mongoose'
import { logger } from '../logger.js'
import { getMediaObjectModel } from '../db/index.js'
import { TagsLeaderboardType, UserMediaQueryInput, AreaMediaQueryInput, ClimbMediaQueryInput, AllTimeTagStats, MediaByUsers, MediaForFeedInput, MediaObject, UserMedia, AreaMedia, ClimbMedia } from '../db/MediaObjectTypes.js'

const HARD_MAX_FILES = 1000
const HARD_MAX_USERS = 100

export default class MediaDataSource extends MongoDataSource<MediaObject> {
  mediaObjectModel = getMediaObjectModel()

  /**
   * A reusable filter to exclude documents with empty entityTags
   */
  entityTagsNotEmptyFilter = [{
    $match: {
      entityTags: { $exists: true, $type: 4, $ne: [] }
    }
  }]

  /**
   * Find one media object by id.  Throw an exception if not found.
   * @param _id
   */
  async getOneMediaObjectById (_id: mongoose.Types.ObjectId): Promise<MediaObject> {
    const rs = await this.mediaObjectModel.find({ _id }).orFail(new Error('Media not found')).lean()
    if (rs != null && rs.length === 1) {
      return rs[0]
    }
    logger.error(`This shouldn't happend. Found multiple media objects for id: ${_id.toString()}`)
    throw new Error('Media not found for id')
  }

  /**
   * Get all media & tags grouped by users
   * @param uuidStr optional user uuid to limit the search, otherwise include all users.
   * @param maxUsers limit the number of users.
   * @param maxFiles limit the number of files per user.
   * @param includesNoEntityTags By default the query exludes media without tags. Specify 'true' override this behavoir.
   * @returns MediaByUsers array
   */
  async getMediaByUsers ({ uuidStr, maxUsers = 10, maxFiles = 10, includesNoEntityTags = false }: MediaForFeedInput): Promise<MediaByUsers[]> {
    const safeMaxFiles = maxFiles > HARD_MAX_FILES ? HARD_MAX_FILES : maxFiles
    const safeMaxUsers = maxUsers > HARD_MAX_USERS ? HARD_MAX_USERS : maxUsers

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
         * Sort by most recently tags media
         */
        $sort: { updatedAt: -1, _id: -1 }
      },
      {
        /**
         * Limit the most recent list.  While unlikely, it may be
         * possible that most recent tags belong to one user.
         * We want this number to be large (to pick up more users).
         */
        $limit: 100
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
        $sort: { 'mediaWithTags.0.updatedAt': -1 }
      },
      {
        $limit: safeMaxUsers
      },
      {
        $project: {
          _id: 0,
          userUuid: '$_id.userUuid',
          mediaWithTags: {
            $slice: ['$mediaWithTags', safeMaxFiles]
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
      logger.error(`Expecting 1 user in result set but got ${rs.length}`)
      return []
    }
    return rs[0].mediaWithTags
  }

  /**
   * Get user media by page.
   *
   * See
   * - https://engage.so/blog/a-deep-dive-into-offset-and-cursor-based-pagination-in-mongodb/#what-is-cursor-based-pagination
   * - https://www.mixmax.com/engineering/api-paging-built-the-right-way
   * - https://graphql.org/learn/pagination/
   * @param input
   * @returns array of UserMedia
   */
  async getOneUserMediaPagination (input: UserMediaQueryInput): Promise<UserMedia> {
    const { userUuid, first = 6, after } = input
    const filters = this.mediaFilters(after, userUuid, 'user')
    const filteredMedia = await this.aggregateMedia(filters, first)
    const itemCount = await this.mediaObjectModel.countDocuments(this.getMatchClause(userUuid, 'user'))
    let hasNextPage = false
    if (filteredMedia.length > first) {
      // ok there's a next page. remove the extra item.
      filteredMedia.pop()
      hasNextPage = true
    }

    return {
      userUuid: userUuid.toUUID().toString(),
      mediaConnection: this.getMediaConnection(filteredMedia, itemCount, hasNextPage)
    }
  }

  /**
   * Get Area media by page.
   * @param input
   * @returns array of AreaMedia
   */
  async getOneAreaMediaPagination (input: AreaMediaQueryInput): Promise<AreaMedia> {
    const { areaUuid, first = 6, after } = input
    const filters = this.mediaFilters(after, areaUuid, 'area')
    const filteredMedia = await this.aggregateMedia(filters, first)
    const itemCount = await this.mediaObjectModel.countDocuments(this.getMatchClause(areaUuid, 'area'))
    let hasNextPage = false
    if (filteredMedia.length > first) {
      filteredMedia.pop()
      hasNextPage = true
    }

    return {
      areaUuid: areaUuid.toUUID().toString(),
      mediaConnection: this.getMediaConnection(filteredMedia, itemCount, hasNextPage)
    }
  }

  /**
   * Get Climb media by page.
   * @param input
   * @returns array of ClimbMedia
   */
  async getOneClimbMediaPagination (input: ClimbMediaQueryInput): Promise<ClimbMedia> {
    const { climbUuid, first = 6, after } = input
    const filters = this.mediaFilters(after, climbUuid, 'climb')
    const filteredMedia = await this.aggregateMedia(filters, first)
    const itemCount = await this.mediaObjectModel.countDocuments(this.getMatchClause(climbUuid, 'climb'))
    let hasNextPage = false
    if (filteredMedia.length > first) {
      filteredMedia.pop()
      hasNextPage = true
    }

    return {
      climbUuid: climbUuid.toUUID().toString(),
      mediaConnection: this.getMediaConnection(filteredMedia, itemCount, hasNextPage)
    }
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
       * for this query.
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
   * @returns `MediaWithTags` array
   */
  async findMediaByAreaId (areaId: MUUID, projection: any, shouldConvertUuidToString = false): Promise<MediaObject[]> {
    const transformFn = (doc: MediaObject): any => {
      if (doc == null) return
      // @ts-expect-error
      doc.entityTags = doc.entityTags?.map(tag => ({ ...tag, targetId: tag.targetId.toUUID().toString() }))
      return doc
    }
    const rs = await this.mediaObjectModel
      .find({
        'entityTags.ancestors': { $regex: areaId.toUUID().toString() }
      }, projection)
      .lean({
        transform: shouldConvertUuidToString ? transformFn : null
      })
    return rs ?? []
  }

  /**
   * Test whether a user is the owner of a media object
   * @param userUuid user id to check
   * @param mediaId media id to check
   * @returns true if userUuid is the owner
   */
  async isMediaOwner (userUuid: MUUID, mediaId: string): Promise<boolean> {
    const _id = new mongoose.Types.ObjectId(mediaId)
    /**
     * According to the query planner 'find()' is a cover query
     * whereas `exists()` uses IXSCAN but has more more stages (LIMT and PROJECTION)
     */
    const doc = await this.mediaObjectModel.find({ _id, userUuid }, { _id: 1 }).lean()
    return doc != null
  }

  /**
   * helper functions for quering media objects by user, area, or climb. Each query has slightly different syntax,
   * so these private functions return the appropriate filter for the query.
   * @param entityUuid area, climb or user uuid
   * @param entityType 'area', 'climb', or 'user'
   * @returns
   */

  private mediaFilters (after: string | undefined, entityUuid: MUUID, entityType: string): any {
    let nextCreatedDate: number
    let nextId: mongoose.Types.ObjectId
    let filters: any
    const matchClause = this.getMatchClause(entityUuid, entityType)

    if (after != null) {
      const d = after.split('_')
      nextCreatedDate = Number.parseInt(d[0])
      nextId = new mongoose.Types.ObjectId(d[1])
      filters = {
        $match: {
          $and: [
            matchClause,
            {
              $or: [{
                createdAt: { $lt: new Date(nextCreatedDate) }
              },
              {
                // If the created date is an exact match, we need a tiebreaker,
                // so we use the _id field from the cursor.
                createdAt: new Date(nextCreatedDate),
                _id: { $lt: nextId }
              }
              ]
            }
          ]
        }
      }
    } else {
      filters = { $match: matchClause }
    }
    return filters
  }

  private getMatchClause (entityUuid: MUUID, entityType: string): any {
    if (entityType === 'user') {
      return { userUuid: entityUuid }
    } else if (entityType === 'area') {
      return { 'entityTags.ancestors': { $regex: entityUuid.toUUID().toString() } }
    } else if (entityType === 'climb') {
      return { 'entityTags.targetId': entityUuid }
    }
    throw new Error(`Unexpected entity type: ${entityType}`)
  }

  private async aggregateMedia (filters: any, first: number): Promise<MediaObject[]> {
    return await this.mediaObjectModel.aggregate<MediaObject>([
      filters,
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: first + 1 } // fetch 1 extra to see if there's a next page
    ])
  }

  private getMediaConnection (filteredMedia: MediaObject[], itemCount: number, hasNextPage: boolean): any {
    return {
      edges: filteredMedia.map(node => (
        {
          node,
          cursor: `${node.createdAt.getTime()}_${node._id.toString()}`
        }
      )),
      pageInfo: {
        hasNextPage,
        totalItems: itemCount,
        endCursor: null
      }
    }
  }
}
