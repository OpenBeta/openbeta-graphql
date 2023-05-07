import { connectDB, getMediaModel, gracefulExit } from '../../../index.js'
import { logger } from '../../../../logger.js'
import { getMediaObjectModel } from '../../../MediaObjectSchema.js'

const knownIssuesFilter = {
  $match: {
    $and: [
      /**
       * We don't support .heic files
       */
      { mediaUrl: { $not: /heic$/i } },
      /**
       * User folder was deleted from Sirv.com but this tag is still left behind
       */
      { mediaUrl: { $ne: '/u/515b2003-9b53-46f8-ac6e-667718315c10/rCh6Fnbb6G.jpeg' } }
    ]
  }
}

/**
 * Move tags in Media collection to embedded tags in the new Media Objects collection.
 */
const onConnected = async (): Promise<void> => {
  logger.info('Verifying...')
  const mediaObjectModel = getMediaObjectModel()
  const oldTagModel = getMediaModel()

  const checkTagCounts = async (): Promise<void> => {
    const rs0 = await oldTagModel.aggregate<{ count: number }>([
      knownIssuesFilter,
      {
        $group: {
          _id: '$onModel',
          count: { $count: {} }
        }
      },
      {
        $project: {
          _id: 0,
          tagType: '$_id',
          count: 1
        }
      }
    ])

    const rs1 = await mediaObjectModel.aggregate([
      {
        $unwind: {
          path: '$entityTags'
        }
      }
    ])

    const oldTagCount = rs0[0].count + rs0[1].count
    const newTagCount = rs1.length

    logger.info({ oldTagCount, newTagCount, result: oldTagCount === newTagCount ? 'PASS' : 'FAIL' }, 'Old vs new tag count')
  }

  /**
   * Compare all tagged climbs and areas in the older collection
   *  to see if they're added to the new entityTags.
   */
  const checkOrphaneIDs = async (): Promise<void> => {
    const rs = await oldTagModel.aggregate([
      knownIssuesFilter,
      {
        $lookup: {
          from: mediaObjectModel.modelName,
          foreignField: 'entityTags.targetId',
          localField: 'destinationId',
          as: 'matchingTags'
        }
      },
      {
        $match: {
          matchingTags: {
            $size: 0
          }
        }
      }
    ])

    logger.info({ found: rs, result: rs.length === 0 ? 'PASS' : 'FAIL' }, 'Orphane IDs check')
  }
  await checkTagCounts()
  await checkOrphaneIDs()

  await gracefulExit()
}

void connectDB(onConnected)
