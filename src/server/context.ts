import 'dotenv/config';
import { Database } from '@schema';
import { Actor } from 'beta/actor';
import { AreaRepo } from 'beta/repo/area';
import { ClimbRepo } from 'beta/repo/climb';
import { drizzle } from 'drizzle-orm/node-postgres';
import { type IncomingMessage, type ServerResponse } from 'http';

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
  return {
    db: __db,
    actor: null,
    repo: {
      area: new AreaRepo(__db),
      climb: new ClimbRepo(__db),
    },
  };
}
