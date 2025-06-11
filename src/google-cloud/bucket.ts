import { MediaObject } from '../db/MediaObjectTypes.js'
import { extname } from 'path'
import { customAlphabet } from 'nanoid'

const nolookalikesSafe = '6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz'
export const safeRandomFilename = customAlphabet(nolookalikesSafe, 10)
export const safeFilename = (original: string): string => {
  return safeRandomFilename() + extname(original)
}

export interface BucketStorage {
  signedUrl: (path: string) => Promise<{ url: string, expires: number }>
  deleteFile: (url: string) => Promise<void>
  getFileInfo: (url: string) => Promise<Pick<MediaObject, 'size' | 'width' | 'height' | 'format'>>
  fileExists: (url: string | string[]) => Promise<boolean[]>
}

export class BucketStorageError extends Error {}

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
