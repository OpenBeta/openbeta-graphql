import { logger } from '../logger.js'
import { ImageFormatType, MediaObject } from '../db/MediaObjectTypes.js'
import MutableMediaDataSource from '../model/MutableMediaDataSource.js'
import { googleStorage } from './gcs-storage.js'
import { GCS_CLOUD_BUCKET_ID } from './index.js'
import { Storage } from '@google-cloud/storage'
import { BucketStorage, BucketStorageError, MediaIdentity } from './bucket.js'

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

    // An unreified and valid media object
    await work(media, mutableDs)
  } catch (error) {
    logger.error(error.message)
    throw error
  }
}

export async function mediaAdded (message: MediaIdentity): Promise<void> {
  await standardMessageHandlingLifecycle(message, async (media, mutableDs) => {
    // If we have already flagged this media as reified then we needn't do any message processing
    // and we can step over immediately to acknowledging the message.
    if (media.expiresAt === undefined) {
      return
    }

    // Prevent mongodb from cleaning up this record, since it has been reified by the user.
    await mutableDs.mediaObjectModel.updateOne({ _id: media._id }, { $unset: { expiresAt: 1 } })
  })
}

export class GoogleStorage implements BucketStorage {
  private readonly storage: Storage
  private readonly bucketName: string

  constructor (bucketName: string = GCS_CLOUD_BUCKET_ID ?? '') {
    if (bucketName === '') throw new Error('env var GCS_CLOUD_BUCKET_ID is not set or you did not provide a proper string to GoogleStorage')
    this.storage = googleStorage()
    this.bucketName = bucketName
  }

  async fileExists (url: string): Promise<[boolean]> {
    return await this.storage.bucket(this.bucketName).file(url).exists()
  }

  async signedUrl (filename: string): Promise<{ url: string, expires: number }> {
    const expires = Date.now() + 15 * 60 * 1000
    const options = {
      version: 'v4' as 'v4',
      action: 'write' as 'write',
      expires
    }

    const [url] = await this.storage
      .bucket(this.bucketName)
      .file(filename)
      .getSignedUrl(options)

    return { url, expires }
  }

  async getFileInfo (url: string): Promise<Pick<MediaObject, 'size' | 'width' | 'height' | 'format'>> {
    const parsedUrl = new URL(url)
    const pathParts = parsedUrl.pathname.split('/')
    const fileName = pathParts.pop()
    const bucketName = pathParts[1]

    if (fileName === undefined || fileName === '' || bucketName === undefined || bucketName === '') {
      throw new BucketStorageError('Invalid URL format.')
    }

    const file = this.storage.bucket(bucketName).file(fileName)
    const [metadata] = await file.getMetadata()

    if (metadata === undefined) {
      throw new BucketStorageError('File not found.')
    }

    const size = parseInt(metadata.size, 10)
    const width = parseInt(metadata.width, 10)
    const height = parseInt(metadata.height, 10)
    const format: ImageFormatType = metadata.contentEncoding

    if (format === undefined) { throw new BucketStorageError(`Format could not be determined from ${JSON.stringify(metadata)}`) }

    return { size, width, height, format }
  }

  async deleteFile (url: string): Promise<void> {
    const parsedUrl = new URL(url)
    const pathParts = parsedUrl.pathname.split('/')
    const fileName = pathParts.pop()
    const bucketName = pathParts[1]

    if (fileName === undefined || fileName === '' || bucketName === undefined || bucketName === '') {
      throw new BucketStorageError('Invalid URL format.')
    }

    await this.storage.bucket(bucketName).file(fileName).delete()
  }
}
