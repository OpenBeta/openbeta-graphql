import muid from 'uuid-mongodb'
import { AuthUserType } from '../types'
import { verifyJWT } from './util'
import { logger } from '../logger'

/**
 * Create a middleware context for Apollo server
 */
export const createContext = async ({ req }): Promise<any> => {
  const { headers } = req

  const user: AuthUserType = {
    roles: [],
    uuid: undefined,
    isBuilder: false
  }

  const authHeader = String(headers?.authorization ?? '')
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7, authHeader.length).trim()

    let payload
    try {
      payload = await verifyJWT(token)
    } catch (e) {
      logger.error(`Can't verify JWT token ${e.toString() as string}`)
      throw new Error('An unexpected error has occurred.  Please notify us at support@openbeta.io.')
    }

    user.isBuilder = payload?.scope?.includes('builder:default') ?? false
    user.roles = payload?.['https://tacos.openbeta.io/roles'] ?? []
    const uidStr: string | undefined = payload?.['https://tacos.openbeta.io/uuid']
    user.uuid = uidStr != null ? muid.from(uidStr) : undefined
  }

  return { user }
}
