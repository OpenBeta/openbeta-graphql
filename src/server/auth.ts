import * as jose from 'jose';

let remoteJWKS: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

export interface TokenPayload extends jose.JWTPayload {
  email?: string;
  sub?: string;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWKS_URI = process.env.JWKS_URI;
  const JWT_ISSUER = process.env.JWT_ISSUER;
  const JWT_AUDIENCE = process.env.JWT_AUDIENCE;

  if (JWKS_URI && !remoteJWKS) {
    remoteJWKS = jose.createRemoteJWKSet(new URL(JWKS_URI));
  }

  const secretKey = JWT_SECRET
    ? new TextEncoder().encode(JWT_SECRET)
    : null;

  try {
    const options: jose.JWTVerifyOptions = {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    };

    let result;
    if (JWKS_URI && remoteJWKS) {
      result = await jose.jwtVerify(token, remoteJWKS, options);
    } else if (secretKey) {
      result = await jose.jwtVerify(token, secretKey, options);
    } else {
      console.warn(
        'Authentication configured but neither JWT_SECRET nor JWKS_URI is set.',
      );
      return null;
    }

    return result.payload as TokenPayload;
  } catch (error) {
    console.error(
      'JWT Verification failed:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
