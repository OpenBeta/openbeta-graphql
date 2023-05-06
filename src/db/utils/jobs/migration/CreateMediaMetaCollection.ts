import sharp from 'sharp'
import { glob } from 'glob'
import { validate as uuidValidate } from 'uuid'
import muuid from 'uuid-mongodb'

import { connectDB, gracefulExit } from '../../../index.js'
import { logger } from '../../../../logger.js'
import { MediaObject } from '../../../MediaObjectType.js'
import { getMediaObjectModel } from '../../../MediaObjectSchema.js'
import { getFileInfo } from './SirvClient.js'

const LOCAL_MEDIA_DIR = process.env.LOCAL_MEDIA_DIR

if (LOCAL_MEDIA_DIR == null) {
  throw new Error('LOCAL_MEDIA_DIR env not defined')
}

/**
 * Build the media object collection from media files on disk
 */
const onConnected = async (): Promise<void> => {
  logger.info('Creating photo collection')
  const model = getMediaObjectModel()
  await model.ensureIndexes()
  const images = await glob(LOCAL_MEDIA_DIR, {
    nodir: true,
    stat: true,
    withFileTypes: true
  })

  let list: any[] = []
  let count = 0
  for (const image of images) {
    const { width, height, format } = await sharp(image.fullpath()).metadata()
    if (width == null || height == null || image.size == null) continue
    if ((format !== 'avif' && format !== 'jpeg' && format !== 'png' && format !== 'webp')) continue

    const folderUuidStr = image.parent?.name ?? ''
    if (!uuidValidate(folderUuidStr)) {
      console.error('Error: expect folder name to have uuid format.  Found ', folderUuidStr)
      continue
    }
    const userUuid = muuid.from(folderUuidStr)
    const mediaUrl = `/u/${folderUuidStr}/${image.name}`
    const { btime } = await getFileInfo(mediaUrl)
    const meta: Omit<MediaObject, '_id'> = {
      userUuid,
      mediaUrl,
      size: image.size,
      width,
      height,
      format,
      entityTags: [],
      createdAt: btime
    }
    list.push(meta)
    count = count + 1

    if (list.length === 20) {
      await model.insertMany(list)
      list = []
    }
  }

  if (list.length > 0) {
    await model.insertMany(list)
  }

  console.log('#count', count)

  await gracefulExit()
}

void connectDB(onConnected)
