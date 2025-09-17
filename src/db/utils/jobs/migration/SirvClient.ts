import axios from 'axios'
import { CircuitBreaker, retryWithBackoff } from '../../../../utils/CircuitBreaker'

const SIRV_CONFIG = {
  clientId: process.env.SIRV_CLIENT_ID_RO ?? null,
  clientSecret: process.env.SIRV_CLIENT_SECRET_RO ?? null
}

const client = axios.create({
  baseURL: 'https://api.sirv.com/v2',
  headers: {
    'content-type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
})

// Add axios interceptors for better error handling
client.interceptors.response.use(
  response => response,
  async error => {
    console.error('Sirv API error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        method: error.config?.method,
        url: error.config?.url
      }
    })
    return await Promise.reject(error)
  }
)

const headers = {
  'content-type': 'application/json'
}

interface TokenParamsType {
  clientId: string | null
  clientSecret: string | null
}

// Circuit breaker for Sirv API calls
const sirvCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  monitoringPeriod: 10000 // 10 seconds
})

const getToken = async (): Promise<string | null> => {
  const params: TokenParamsType = {
    clientId: SIRV_CONFIG.clientId,
    clientSecret: SIRV_CONFIG.clientSecret
  }

  try {
    const res = await sirvCircuitBreaker.execute(async () => {
      return await retryWithBackoff(async () => {
        return await client.post('/token', params)
      }, 3, 1000, 5000)
    })

    if (res.status === 200) {
      return res.data.token
    }
  } catch (e) {
    console.error('Failed to get Sirv token after retries:', e)
    // Don't exit process - let the app continue without Sirv functionality
    return null
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
  try {
    const res = await sirvCircuitBreaker.execute(async () => {
      return await retryWithBackoff(async () => {
        return await client.get(
          '/files/stat?filename=' + encodeURIComponent(filename),
          {
            headers: {
              ...headers,
              Authorization: `bearer ${token}`
            }
          }
        )
      }, 3, 1000, 5000)
    })

    if (res.status === 200) {
      const { ctime, mtime } = res.data
      return ({
        btime: new Date(ctime),
        mtime: new Date(mtime)
      })
    }
    throw new Error('Sirv API.getFileInfo() error: ' + String(res.statusText))
  } catch (e) {
    console.error('Failed to get file info after retries:', e)
    throw e
  }
}
