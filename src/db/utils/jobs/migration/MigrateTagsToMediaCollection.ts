import { connectDB, getMediaModel, gracefulExit } from '../../../index.js'
import { logger } from '../../../../logger.js'
import { getMediaObjectModel } from '../../../MediaObjectSchema.js'
import { EntityTag } from '../../../MediaObjectTypes.js'

/**
 * Move tags in Media collection to embedded tags in the new Media Objects collection.
 */
const onConnected = async (): Promise<void> => {
  logger.info('Migrating tags...')
  const mediaObjectModel = getMediaObjectModel()
  const oldTagModel = getMediaModel()

  /**
   * Initialize entityTags to []
   */
  await mediaObjectModel.updateMany({}, {
    $set: {
      entityTags: []
    }
  })

  let count = 0

  const taggedClimbsPipeline = [
    {
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
          $unwind: '$area'
        }
        ]
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
        localField: 'destinationId',
        as: 'taggedArea'
      }
    },
    {
      $unwind: {
        path: '$taggedArea',
        preserveNullAndEmptyArrays: true
      }
    }
  ]

  await oldTagModel.aggregate([
    ...taggedClimbsPipeline,
    ...taggedAreasPipeline,
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
      $group: {
        _id: {
          destType: '$destType',
          mediaUrl: '$mediaUrl',
          targetId: '$destinationId'
        },
        taggedAreas: { $push: '$taggedArea' },
        taggedClimbs: { $push: '$taggedClimb' }
      }
    }
  ]).cursor().eachAsync(async doc => {
    const mediaUrl: string = doc._id.mediaUrl

    let d: EntityTag[] = []
    switch (doc._id.destType) {
      case 0: {
        console.log('#Add climb tags')
        d = doc.taggedClimbs.map((tag) => ({
          targetId: tag._id,
          climbName: tag.name,
          areaName: tag.area.area_name,
          ancestors: tag.area.ancestors,
          type: 0,
          lnglat: tag.metadata.lnglat
        }))

        break
      }
      case 1: {
        console.log('#Add area tags')

        d = doc.taggedAreas.map(tag => ({
          targetId: tag.metadata.area_id,
          areaName: tag.area_name,
          ancestors: tag.ancestors,
          type: 1,
          lnglat: tag.metadata.lnglat
        }))

        break
      }
    }

    if (d.length > 0) {
      await mediaObjectModel.updateOne({ mediaUrl }, {
        $addToSet: { entityTags: d }
      }).lean()

      count = count + d.length
    }
  })

  console.log('##count', count)
  await gracefulExit()
}

void connectDB(onConnected)
