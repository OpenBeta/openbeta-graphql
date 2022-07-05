import { AuthUserType } from '../types.js'
import { verifyJWT } from './util.js'

/**
 * Create a middleware context for Apollo server
 */
export const createContext = async ({ req }): Promise<any> => {
  const { headers } = req

  const user: AuthUserType = {
    roles: []
  }

  const authHeader = String(headers?.authorization ?? '')
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7, authHeader.length).trim()
    const z = await verifyJWT(token)
    user.roles = z?.['https://tacos.openbeta.io/roles'] ?? []
  }

  return { user }
}
