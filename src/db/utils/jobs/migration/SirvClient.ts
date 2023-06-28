import axios from 'axios'

const SIRV_CONFIG = {
  clientId: process.env.SIRV_CLIENT_ID_RO ?? null,
  clientSecret: process.env.SIRV_CLIENT_SECRET_RO ?? null
}

const client = axios.create({
  baseURL: 'https://api.sirv.com/v2',
  headers: {
    'content-type': 'application/json'
  }
})

const headers = {
  'content-type': 'application/json'
}

interface TokenParamsType {
  clientId: string | null
  clientSecret: string | null
}

const getToken = async (): Promise<string | null> => {
  const params: TokenParamsType = {
    clientId: SIRV_CONFIG.clientId,
    clientSecret: SIRV_CONFIG.clientSecret
  }

  try {
    const res = await client.post(
      '/token',
      params)

    if (res.status === 200) {
      return res.data.token
    }
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
  return null
}

const token = await getToken() ?? ''

interface FileMetadaata {
  mtime: Date
  btime: Date
}

/**
 * When downloading photos from Sirv using rclone or on the UI,
 * the image file's upload time  is lost.  This function gets
 * the original upload timestamp.
 * @param filename
 * @returns
 */
export const getFileInfo = async (filename: string): Promise<FileMetadaata> => {
  const res = await client.get(
    '/files/stat?filename=' + encodeURIComponent(filename),
    {
      headers: {
        ...headers,
        Authorization: `bearer ${token}`
      }
    }
  )

  if (res.status === 200) {
    const { ctime, mtime } = res.data
    return ({
      btime: new Date(ctime),
      mtime: new Date(mtime)
    })
  }
  throw new Error('Sirv API.getFileInfo() error' + res.statusText)
}
