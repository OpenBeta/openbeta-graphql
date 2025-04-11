import { OAuth2Client } from 'google-auth-library'
import { Request } from 'express'
import { logger } from '../logger.js'
import { MessageHandlingError } from './adapter-interface.js'

const client = new OAuth2Client()

export interface JWTPayload {
  iss?: string
  aud?: string
  exp?: number
  iat?: number
  email?: string
  [key: string]: any
}

export type JwtValidator = (req: Request) => Promise<JWTPayload>

/**
 * Utilizes a Google client library to verify the token's signature, audience
 * against a configured environment variable, issuer against the expected Google
 * accounts issuer, and expiration time against the current time. If any of these
 * checks fail, the function sends an unauthorized (401) response with a corresponding
 * error message (nack)
 */
export async function validateGoogleJWT (req: Request): Promise<JWTPayload> {
  const authorizationHeader = req.headers.authorization

  if (authorizationHeader === undefined || !authorizationHeader.startsWith('Bearer ')) {
    throw new MessageHandlingError('Unauthorized - Missing or invalid Authorization header')
  }

  const jwtToken = authorizationHeader.substring(7)

  try {
    const ticket = await client.verifyIdToken({ idToken: jwtToken })
    const payload = ticket.getPayload() as JWTPayload
    const expectedIssuer = 'https://accounts.google.com'

    // Google MUST have issued this token
    if ((payload.iss ?? '') === '' || payload.iss !== expectedIssuer) {
      throw new MessageHandlingError('Unauthorized - Invalid JWT - Incorrect issuer')
    }

    // The token cannot be stale
    if ((payload.exp === undefined) || payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new MessageHandlingError('Unauthorized - Invalid JWT - Expired')
    }

    return payload
  } catch (error: any) {
    logger.error('Error validating Google JWT:', error)
    throw new MessageHandlingError('Unauthorized - Invalid JWT')
  }
}
