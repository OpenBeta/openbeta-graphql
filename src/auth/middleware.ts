import muid from 'uuid-mongodb'
import { AuthUserType } from '../types.js'
import { verifyJWT } from './util.js'
import { StandaloneServerContextFunctionArgument as ContextInput } from '@apollo/server/dist/esm/standalone/index.js'

export interface GraphQLContext {
  user: AuthUserType
}

/**
 * Create a middleware context for Apollo server
 */
export async function createContext ({ req }: ContextInput): Promise<GraphQLContext> {
  const { headers } = req

  const user: AuthUserType = {
    roles: [],
    uuid: undefined
  }

  const authHeader = String(headers?.authorization ?? '')

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7, authHeader.length).trim()
    const z = await verifyJWT(token)

    user.roles = z?.['https://tacos.openbeta.io/roles'] ?? []
    const uidStr: string | undefined = z?.['https://tacos.openbeta.io/uuid']
    user.uuid = uidStr != null ? muid.from(uidStr) : undefined
  }

  return { user }
}
