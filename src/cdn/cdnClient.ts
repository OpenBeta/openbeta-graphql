import { Storage } from '@google-cloud/storage'

const storage = new Storage({
  projectId: 'openbeta',
  credentials: {
    type: 'service-account',
    client_email: 'photo-bucket-admin@openbeta.iam.gserviceaccount.com',
    private_key: ''
  }
})

/**
 * Get a user's media files. May not need this.
 * @param uuidStr user id in uuid v4 format
 * @returns a list media objects including associated tags
 */
export const getUserMedia = async (uuidStr: string): Promise<string[]> => {
  const [files] = await storage.bucket('openbeta-staging').getFiles({
    autoPaginate: false,
    prefix: `u/${uuidStr}/`, //
    delimiter: '/'
  })
  return files.reduce<string[]>((acc, curr) => {
    if (!curr.name.endsWith('.json')) {
      acc.push(`/${curr.name}`)
    }
    return acc
  }, [])
}
