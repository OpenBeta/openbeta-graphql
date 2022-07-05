import jwksClient from 'jwks-rsa'
import jwt from 'jsonwebtoken'

const client = jwksClient({
  jwksUri: 'https://dev-fmjy7n5n.us.auth0.com/.well-known/jwks.json'
})

const kid = 'uciP2tJdJ4BKWoz73Fmln'

export const verifyJWT = async (token): Promise<any> => {
  const key = await client.getSigningKey(kid)
  return jwt.verify(token, key.getPublicKey())
}
