import jwksClient from 'jwks-rsa'
import jwt, { JwtPayload } from 'jsonwebtoken'

import { checkVar } from '../db/index.js'

const auth0Domain = checkVar('AUTH0_DOMAIN')
const auth0Kid = checkVar('AUTH0_KID')

const client = jwksClient({
  jwksUri: `${auth0Domain}/.well-known/jwks.json`
})

/**
 * Synchronously verify given token using a secret or a public key to get a decoded token
 * token - JWT string to verify
 * returns - The decoded token.
 * */
export const verifyJWT = async (token): Promise<JwtPayload | string> => {
  const key = await client.getSigningKey(auth0Kid)
  return jwt.verify(token, key.getPublicKey())
}
