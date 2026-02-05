import 'dotenv/config';
import { Database, user } from '@schema';
import { Actor } from 'beta/actor';
import { AreaRepo } from 'beta/repo/area';
import { ClimbRepo } from 'beta/repo/climb';
import { UserActor } from 'beta/userActor';
import { eq, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { type IncomingMessage, type ServerResponse } from 'http';
import { verifyToken } from './auth';

const __db = drizzle(process.env.DATABASE_URL!);

export interface Context {
  db: Database;
  actor: Actor | null;
  repo: {
    area: AreaRepo;
    climb: ClimbRepo;
  };
}

export async function context(
  props: { req: IncomingMessage; res: ServerResponse },
): Promise<Context> {
  let actor: Actor | null = null;
  const authHeader = props.req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (payload) {
      // Find user by email or sub (mapping to uuid or email in our DB)
      const conditions = [];
      if (payload.email) conditions.push(eq(user.email, payload.email));
      if (payload.sub) conditions.push(eq(user.uuid, payload.sub as any));

      if (conditions.length > 0) {
        const [userRecord] = await __db
          .select()
          .from(user)
          .where(or(...conditions))
          .limit(1);

        if (userRecord) {
          actor = new UserActor(userRecord);
        }
      }
    }
  }

  return {
    db: __db,
    actor,
    repo: {
      area: new AreaRepo(__db),
      climb: new ClimbRepo(__db),
    },
  };
}
