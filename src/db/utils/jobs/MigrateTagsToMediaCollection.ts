import { connectDB, getMediaModel, gracefulExit } from '../../index.js'
import { logger } from '../../../logger.js'
import { getMediaObjectModel } from '../../MediaObjectSchema.js'
import { MediaType } from '../../MediaTypes.js'

/**
 * Photo metadata migration job: build a media metadata collection from media files on disk
 */
const onConnected = async (): Promise<void> => {
  logger.info('Migrating tags...')
  const mediaObjectModel = getMediaObjectModel()
  const oldTagModel = getMediaModel()

  let count = 0

  await oldTagModel.aggregate([
    {
      $group: {
        _id: '$mediaUrl',
        tags: { $push: '$$ROOT' }
      }
    },
    {
      $set: {
        tags: {
          $map: {
            input: '$tags',
            in: {
              targetId: '$$this.destinationId',
              type: '$$this.destType'
            }
          }
        }
      }
    }
  ]).cursor().eachAsync(async doc => {
    const mediaUrl: string = doc._id
    const tags: MediaType = doc.tags
    const rs = await mediaObjectModel.updateOne({ mediaUrl }, {
      $set: {
        tags
      }
    })
    count = count + rs.modifiedCount
  })

  console.log('##count', count)
  await gracefulExit()
}

void connectDB(onConnected)
