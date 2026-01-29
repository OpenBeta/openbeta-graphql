import 'dotenv/config';
import { Actor } from 'beta/actor';
import { AreaRepo } from 'beta/repo/area';
import { drizzle } from 'drizzle-orm/node-postgres';
import { type IncomingMessage, type ServerResponse } from 'http';

const __db = drizzle(process.env.DATABASE_URL!);

export interface Context {
  actor: Actor | null;
  repo: {
    area: AreaRepo;
  };
}

export async function context(
  props: { req: IncomingMessage; res: ServerResponse },
): Promise<Context> {
  return {
    actor: null,
    repo: { area: new AreaRepo(__db, null) },
  };
}
