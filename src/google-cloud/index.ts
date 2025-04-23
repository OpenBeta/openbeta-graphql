import Config from '../Config.js'
import fs from 'fs'
import { logger } from '../logger.js'

const GCS_ENABLE_SERVICES: boolean = process.env.GCS_ENABLE_SERVICES === 'true'
const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID
const GCS_CLOUD_BUCKET_ID = process.env.GCS_CLOUD_BUCKET_ID
const GCS_NOTIFICATIONS_SUBSCRIPTION = process.env.GCS_NOTIFICATIONS_SUBSCRIPTION
const GCS_MEDIA_HOOK_URL = process.env.GCS_MEDIA_HOOK_URL
const GCS_BUCKET_CLIENT_EMAIL = process.env.GCS_BUCKET_CLIENT_EMAIL
const GCS_PRIVATE_KEY = process.env.GCS_PRIVATE_KEY ??
  (
    fs.existsSync('./key.json') ? JSON.parse(fs.readFileSync('./key.json')?.toString()).private_key : undefined)

if (Config.DEPLOYMENT_ENV === 'production' && !GCS_ENABLE_SERVICES) {
  logger.warn('GCS is disabled!!!!')
}

export {
  GCS_ENABLE_SERVICES,
  GCS_PROJECT_ID,
  GCS_CLOUD_BUCKET_ID,
  GCS_NOTIFICATIONS_SUBSCRIPTION,
  GCS_MEDIA_HOOK_URL,
  GCS_BUCKET_CLIENT_EMAIL,
  GCS_PRIVATE_KEY
}
