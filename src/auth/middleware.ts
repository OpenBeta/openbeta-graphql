import muid from 'uuid-mongodb'
import { AuthUserType } from '../types.js'
import { verifyJWT } from './util.js'
import { logger } from '../logger.js'

const EMTPY_USER: AuthUserType = {
  isBuilder: false,
  roles: [],
  uuid: undefined
}

/**
 * Create a middleware context for Apollo server
 */
export const createContext = async ({ req }): Promise<any> => {
  try {
    return await validateTokenAndExtractUser(req)
  } catch (e) {
    logger.error(`Can't validate token and extract user ${e.toString() as string}`)
    throw new Error('An unexpected error has occurred.  Please notify us at support@openbeta.io.')
  }
}

async function validateTokenAndExtractUser (req: Request): Promise<{ user: AuthUserType, token?: string }> {
  const { headers } = req
  // eslint-disable-next-line @typescript-eslint/dot-notation
  const authHeader = String(headers?.['authorization'] ?? '')
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7, authHeader.length).trim()
    try {
      const payload = await verifyJWT(token)
      return {
        user: {
          isBuilder: payload?.scope?.includes('builder:default') ?? false,
          roles: payload?.['https://tacos.openbeta.io/roles'] ?? [],
          uuid: payload?.['https://tacos.openbeta.io/uuid'] != null ? muid.from(payload['https://tacos.openbeta.io/uuid']) : undefined
        },
        token
      }
    } catch (e) {
      logger.error(`Can't verify JWT token ${e.toString() as string}`)
      throw new Error("Unauthorized. Can't verify JWT token")
    }
  }

  return {
    user: EMTPY_USER
  }
}
