import muid from 'uuid-mongodb'
import { AuthUserType } from '../types.js'
import { verifyJWT } from './util.js'
import { ExpressContext } from 'apollo-server-express/dist/ApolloServer'

/**
 * Create a middleware context for Apollo server.
 * The primary purpose of this context creator is to take the Auth bearer
 * token and decode it to get the current requests user claim.
 *
 * We are implicityly trusting all claims made by the JWT.
 */
export async function createContext ({ req }: ExpressContext): Promise<{user: AuthUserType}> {
  const { headers } = req

  const user: AuthUserType = {
    roles: [],
    uuid: undefined
  }

  const authHeader = String(headers?.authorization ?? '')

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7, authHeader.length).trim()
    const verifiedToken = await verifyJWT(token)

    user.roles = verifiedToken?.['https://tacos.openbeta.io/roles'] ?? []
    const uidStr: string | undefined = verifiedToken?.['https://tacos.openbeta.io/uuid']
    user.uuid = uidStr != null ? muid.from(uidStr) : undefined
  }

  return { user }
}
