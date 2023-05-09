import muid, { MUUID } from 'uuid-mongodb'
import { logger } from '../logger.js'
import { AuthUserType } from '../types.js'
import { verifyJWT } from './util.js'

/**
 * Create a middleware context for Apollo server
 */
export const createContext = (() => {
  let testUUID: MUUID

  if (process.env.GOD_MODE === 'true') {
    testUUID = muid.v4()
    logger.info(`The user.uuid for this session is: ${testUUID.toString()}`)
  }

  return async ({ req }): Promise<any> => {
    const { headers } = req

    const user: AuthUserType = {
      roles: [],
      uuid: undefined
    }

    if (process.env.GOD_MODE === 'true' && (user.uuid == null)) {
      user.roles = ['user_admin', 'org_admin', 'editor']
      user.uuid = testUUID
    } else {
      const authHeader = String(headers?.authorization ?? '')
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7, authHeader.length).trim()
        const z = await verifyJWT(token)

        user.roles = z?.['https://tacos.openbeta.io/roles'] ?? []
        const uidStr: string | undefined = z?.['https://tacos.openbeta.io/uuid']
        user.uuid = uidStr != null ? muid.from(uidStr) : undefined
      }
    }

    return { user }
  }
})()
