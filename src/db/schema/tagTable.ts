import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { entityTable } from './entitiy';
import { mediaTable } from './mediaTable';

export const tagTable = pgTable('tag', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  mediaId: integer()
    .references(() => mediaTable.id, {
      onDelete: 'cascade',
    }),
  targetId: integer().notNull().references(() => entityTable.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp().notNull().defaultNow(),
});
