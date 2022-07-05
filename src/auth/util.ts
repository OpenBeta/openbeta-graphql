import jwksClient from 'jwks-rsa'
import jwt from 'jsonwebtoken'

const client = jwksClient({

  jwksUri: 'https://dev-fmjy7n5n.us.auth0.com/.well-known/jwks.json'
})

// function getKey (header, callback): any {
//   client.getSigningKey(header.kid, (err, key): any => {
//     const signingKey = key.publicKey || key.rsaPublicKey
//     callback(null, signingKey)
//   })
// }

// uciP2tJdJ4BKWoz73Fmln
// AOPBzksnZcmTwfiYYqCLf
const kid = 'uciP2tJdJ4BKWoz73Fmln'

export const verify = async (token): Promise<any> => {
  const key = await client.getSigningKey(kid)

  return jwt.verify(token, key.getPublicKey())
}
