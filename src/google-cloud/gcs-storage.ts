import { Storage } from '@google-cloud/storage'
import { GCS_BUCKET_CLIENT_EMAIL, GCS_PRIVATE_KEY, GCS_PROJECT_ID } from './index.js'

export const googleStorage = (): Storage => new Storage({
  projectId: GCS_PROJECT_ID,
  credentials: {
    type: 'service_account',
    private_key: GCS_PRIVATE_KEY,
    client_email: GCS_BUCKET_CLIENT_EMAIL
  }
})
