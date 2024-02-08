import muid from 'uuid-mongodb'
import {AuthUserType} from '../types.js'
import {verifyJWT} from './util.js'
import {logger} from '../logger.js'

/**
 * Create a middleware context for Apollo server
 */
export const createContext = async ({req}): Promise<any> => {
  const user: AuthUserType = {
    roles: [],
    uuid: undefined,
    isBuilder: false
  }

  try {
    await validateTokenAndExtractUser(req)
  } catch (e) {
    logger.error(`Can't validate token and extract user ${e.toString() as string}`)
    throw new Error('An unexpected error has occurred.  Please notify us at support@openbeta.io.')
  }

  return {user}
}

export const authMiddleware = async (req, res, next): Promise<void> => {
  try {
    const {user, token} = await validateTokenAndExtractUser(req)
    req.user = user
    req.userId = user.uuid
    req.token = token
    next()
  } catch (e) {
    logger.error(`Can't verify JWT token ${e.toString() as string}`)
    res.status(401).send('Unauthorized')
  }
}

async function validateTokenAndExtractUser(req: Request): Promise<{ user: AuthUserType, token: string }> {
  const {headers} = req
  const authHeader = String(headers?.['authorization'] ?? '')
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized. Please provide a valid JWT token in the Authorization header.')
  }

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
