import fs from 'fs'
import { config } from 'dotenv'
import {
  PutObjectCommand,
  PutObjectCommandOutput,
  S3Client
} from '@aws-sdk/client-s3'
import UploadService, {
  MapboxUploadCredentials,
  MapiResponse
} from '@mapbox/mapbox-sdk/services/uploads.js'
import { logger } from '../../../../logger.js'

config({ path: ['.env.local', '.env'] })

const mapboxUsername = process.env.MAPBOX_USERNAME
const mapboxToken = process.env.MAPBOX_TOKEN
const workingDir = process.env.MAPTILES_WORKING_DIR

if (mapboxUsername == null) {
  throw new Error('MAPBOX_USERNAME not set')
}

if (mapboxToken == null) {
  throw new Error('MAPBOX_TOKEN not set')
}

if (workingDir == null) {
  throw new Error('MAPTILES_WORKING_DIR not set')
}

const uploadsClient = UploadService({ accessToken: mapboxToken })

const getCredentials = async (): Promise<MapboxUploadCredentials> => {
  return uploadsClient
    .createUploadCredentials()
    .send()
    .then(response => response.body)
}

const stageFileOnS3 = async (
  credentials: MapboxUploadCredentials,
  filePath: string
): Promise<PutObjectCommandOutput> => {
  const s3Client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken
    }
  })

  const command = new PutObjectCommand({
    Bucket: credentials.bucket,
    Key: credentials.key,
    Body: fs.createReadStream(filePath)
  })
  const res = await s3Client.send(command)
  return res
}

interface UploadOptions {
  /**
   * Tileset unique ID
   */
  tilesetId: string
  /**
   * Tileset name
   */
  name: string
  /**
   * file path to upload
   */
  filePath: string
}

const notifyMapbox = async (
  credentials: MapboxUploadCredentials,
  { tilesetId, name }: UploadOptions
): Promise<MapiResponse> => {
  const res = await uploadsClient
    .createUpload({
      tileset: `${mapboxUsername}.${tilesetId}`,
      url: credentials.url,
      name
    })
    .send()
  return res
}

/**
 * Upload a tile file to Mapbox.
 * @see https://docs.mapbox.com/api/maps/uploads/
 * @param options
 */
export const upload = async (options: UploadOptions): Promise<void> => {
  try {
    const credentials = await getCredentials()
    const ret = await stageFileOnS3(credentials, options.filePath)
    logger.info(ret.$metadata, 'File staged on S3')
    const res = await notifyMapbox(credentials, options)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      logger.info('File uploaded to Mapbox')
      return await Promise.resolve()
    }
    throw new Error(
      `Create upload failed with status code ${res.statusCode as string}`
    )
  } catch (err) {
    logger.error(err, 'Failed to upload file to Mapbox')
  }
}

export const uploadCragsTiles = async (): Promise<void> => {
  logger.info('Uploading crags tiles')
  const filePath = `${workingDir}/crags.mbtiles`
  await upload({ tilesetId: 'crags', name: 'all crags and boulders', filePath })
}

await uploadCragsTiles()
