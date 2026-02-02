import { Database } from '@schema';
import * as schema from '@schema';
import { Actor } from 'beta/actor';
import { InferSelectModel } from 'drizzle-orm';

export type MediaRecord = InferSelectModel<typeof schema.media>;

class MediaRepo {
  db: Database;
  actor: Actor | undefined;

  constructor(db: Database) {
    this.db = db;
  }
}
