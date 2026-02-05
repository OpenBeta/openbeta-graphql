import { faker } from '@faker-js/faker';
import * as schema from '@schema';
import { IncomingMessage, ServerResponse } from 'http';
import * as jose from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { UserActor } from '../../beta/userActor';
import { context } from '../../server/context';
import { testDb } from '../setup';

const SECRET = 'test-secret-at-least-32-chars-long-!!!';
// Note: These env vars must match what's in auth.test.ts or what the module initialized with
process.env.JWT_SECRET = SECRET;

describe('Server Context', () => {
  it('returns null actor when no auth header is present', async () => {
    const req = { headers: {} } as IncomingMessage;
    const res = {} as ServerResponse;

    const ctx = await context({ req, res });
    expect(ctx.actor).toBeNull();
  });

  it('populates UserActor when valid token matches a user', async () => {
    // 1. Create a test user in the DB
    const email = faker.internet.email().toLowerCase();
    const [dbUser] = await testDb
      .insert(schema.user)
      .values({
        username: faker.internet.username(),
        email: email,
      })
      .returning();

    // 2. Generate a valid token
    const secret = new TextEncoder().encode(SECRET);
    const token = await new jose.SignJWT({ email: email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(process.env.JWT_ISSUER ?? 'test-issuer')
      .setAudience(process.env.JWT_AUDIENCE ?? 'test-audience')
      .setExpirationTime('2h')
      .sign(secret);

    // 3. Call context
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as IncomingMessage;
    const res = {} as ServerResponse;

    const ctx = await context({ req, res });

    // 4. Verify
    expect(ctx.actor).toBeInstanceOf(UserActor);
    expect(ctx.actor?.id).toBe(dbUser.id);
  });

  it('returns null actor when token is valid but user not found', async () => {
    const secret = new TextEncoder().encode(SECRET);
    const token = await new jose.SignJWT({ email: 'nonexistent@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(process.env.JWT_ISSUER ?? 'test-issuer')
      .setAudience(process.env.JWT_AUDIENCE ?? 'test-audience')
      .setExpirationTime('2h')
      .sign(secret);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as IncomingMessage;
    const res = {} as ServerResponse;

    const ctx = await context({ req, res });
    expect(ctx.actor).toBeNull();
  });
});
