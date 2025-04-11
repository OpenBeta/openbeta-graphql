import { logger } from '../logger.js'
import { MediaObject } from '../db/MediaObjectTypes.js'
import MutableMediaDataSource from '../model/MutableMediaDataSource.js'

/**
 * The adapter interface at this level is quite primitive, but depends on one
 * key principal which is not enforced in any meaningful sense but is likely to hold
 * as the project proceeds: Regardless of where the media is stored, we hold a url
 * reference to it in our data store.
 **/
export interface MediaIdentity {
  /**
   * This field is cognate to the mediaUrl in our data store.
   */
  objectId: string
}

export class MessageHandlingError extends Error {}

export async function standardMessageHandlingLifecycle (message: MediaIdentity, work: (media: MediaObject, mutableDs: MutableMediaDataSource) => Promise<void>): Promise<void> {
  const mutableDs = MutableMediaDataSource.getInstance()
  logger.debug(`GCS delivered message to process ${message.objectId}`)

  try {
    const media: MediaObject | null = await mutableDs.mediaObjectModel.findOne({ mediaUrl: message.objectId })

    if (media === null) {
      // In this instance an object has been created that we have not been told about. Presumably,
      // the user must have acquired authorization to upload this image so we don't necessarily need
      // to throw a fit. We could create the object for them, except that we have no way to trust that
      // the filename contains reliable authenticated info.
      return
    }

    // If we have already flagged this media as reified then we needn't do any message processing
    // and we can step over immediately to acknowledging the message.
    if (media.expiresAt === null) {
      return
    }

    // An unreified and valid media object
    await work(media, mutableDs)
  } catch (error) {
    logger.error(error.message)
    throw error
  }
}

export async function mediaAdded (message: MediaIdentity): Promise<void> {
  await standardMessageHandlingLifecycle(message, async (media, mutableDs) => {
    // Prevent mongodb from cleaning up this record, since it has been reified by the user.
    await mutableDs.mediaObjectModel.updateOne({ _id: media._id }, { $unset: { expiresAt: 1 } })
  })
}
