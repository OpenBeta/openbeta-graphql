import jwksClient from 'jwks-rsa'
import jwt from 'jsonwebtoken'

import { checkVar } from '../db/index'

const auth0Domain = checkVar('AUTH0_DOMAIN')
const auth0Kid = checkVar('AUTH0_KID')

const client = jwksClient({
  jwksUri: `${auth0Domain}/.well-known/jwks.json`
})

export const verifyJWT = async (token): Promise<any> => {
  const key = await client.getSigningKey(auth0Kid)
  return jwt.verify(token, key.getPublicKey())
}
