import sharp from 'sharp'
import { glob } from 'glob'
import { connectDB, gracefulExit } from '../../index.js'
import { logger } from '../../../logger.js'
import { MediaMetaType } from '../../MediaMetaType.js'
import { getMediaObjectModel } from '../../MediaObjectSchema.js'

const onConnected = async (): Promise<void> => {
  logger.info('Creating photo collection')
  const model = getMediaObjectModel()
  await model.ensureIndexes()
  const images = await glob('/Users/vnguyen/Downloads/u/**/*.{png,jpg,jpeg,webp}', {
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

    const meta: MediaMetaType = {
      name: `/u/${image.parent?.name ?? ''}/${image.name}`,
      mtime: new Date(Math.round(image?.mtimeMs ?? 0)),
      birthTime: new Date(Math.round(image?.birthtimeMs ?? 0)),
      size: image.size,
      width,
      height,
      format
    }
    list.push(meta)
    count = count + 1

    if (list.length === 10) {
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
