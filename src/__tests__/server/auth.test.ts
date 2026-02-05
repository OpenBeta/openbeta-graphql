import * as jose from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyToken } from '../../server/auth';

// We need to mock process.env before importing verifyToken if we want to change it,
// but since it's already likely imported, we might need to reset modules.
// However, for this test, we'll just set the env vars that the module expects.

const SECRET = 'test-secret-at-least-32-chars-long-!!!';
process.env.JWT_SECRET = SECRET;
process.env.JWT_ISSUER = 'test-issuer';
process.env.JWT_AUDIENCE = 'test-audience';

describe('Auth Service', () => {
  it('verifies a valid token', async () => {
    const secret = new TextEncoder().encode(SECRET);
    const token = await new jose.SignJWT({ email: 'test@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('test-issuer')
      .setAudience('test-audience')
      .setExpirationTime('2h')
      .sign(secret);

    const payload = await verifyToken(token);
    expect(payload).toBeDefined();
    expect(payload?.email).toBe('test@example.com');
  });

  it('returns null for an invalid token', async () => {
    const payload = await verifyToken('invalid-token');
    expect(payload).toBeNull();
  });

  it('returns null for a token with wrong issuer', async () => {
    const secret = new TextEncoder().encode(SECRET);
    const token = await new jose.SignJWT({ email: 'test@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('wrong-issuer')
      .sign(secret);

    const payload = await verifyToken(token);
    expect(payload).toBeNull();
  });

  it('returns null for an expired token', async () => {
    const secret = new TextEncoder().encode(SECRET);
    const token = await new jose.SignJWT({ email: 'test@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('test-issuer')
      .setAudience('test-audience')
      .setExpirationTime('-1h') // Expired 1 hour ago
      .sign(secret);

    const payload = await verifyToken(token);
    expect(payload).toBeNull();
  });
});
