import { MediaObject } from '../db/MediaObjectTypes'
import fs from 'fs/promises'
import { fileTypeFromFile } from 'file-type'
import decode from 'image-decode'
import sizeOf from 'image-size'
import { BucketStorage, BucketStorageError } from './bucket.js'

/**
 * When doing local development and local integration, we can use a localfilestorage interface
 */
export class LocalFileStorage implements BucketStorage {
  async fileExists (url: string | string[]): Promise<boolean[]> {
    if (Array.isArray(url)) {
      return await Promise.all(url.map(async f => await fs.readFile(`./bucket/${f}`).then(() => true).catch(() => false)))
    }
    return [await fs.readFile(`./bucket/${url}`).then(() => true).catch(() => false)]
  }

  async signedUrl (path: string): Promise<{ url: string, expires: number }> {
    const expires = Date.now() + 15 * 60 * 1000

    return { url: `http://localhost:4000/rest/media/${path}`, expires }
  }

  async deleteFile (url: string): Promise<void> {
    await fs.unlink(`./bucket/${url}`)
  }

  async getFileInfo (url: string): Promise<Pick<MediaObject, 'size' | 'width' | 'height' | 'format'>> {
    const localFilePath = `./bucket/${url}`
    const buffer = await fs.readFile(localFilePath)
    const stats = await fs.stat(localFilePath)
    const size = stats.size
    let width: number | undefined
    let height: number | undefined
    let format: string | undefined

    const fileTypeResult = await fileTypeFromFile(localFilePath)
    if (fileTypeResult !== undefined) {
      format = fileTypeResult.mime.replace('image/', '')

      try {
        const dimensions = sizeOf(buffer)
        width = dimensions.width
        height = dimensions.height
      } catch (error) {
        console.warn(`Error getting dimensions with image-size for ${localFilePath}:`, error)
        // Fallback to decode if it's a supported image type (excluding AVIF for now)
        if (['jpeg', 'png'].includes(format)) {
          try {
            const image = decode(buffer)
            width = image.width
            height = image.height
          } catch (decodeError) {
            console.warn(`Error decoding image ${localFilePath}:`, decodeError)
          }
        }
      }
    }

    if (width === undefined || height === undefined || format === undefined) {
      throw new BucketStorageError(`Could not determine width/height/format of file ${JSON.stringify({ width, height, format })}`)
    }

    return { size, width, height, format: format as MediaObject['format'] }
  }
}
