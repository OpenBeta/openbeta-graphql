import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { entityTable } from './entitiy';
import { userTable } from './userTable';

export const historyTable = pgTable('entity_history', {
  id: bigint('id', { mode: 'number' })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  author: integer()
    .references(() => userTable.id, { onDelete: 'restrict' })
    .notNull(),
  entity: integer()
    .notNull()
    .references(() => entityTable.id, { onDelete: 'cascade' }),
  editTime: timestamp().notNull().defaultNow(),
  before: jsonb(),
  after: jsonb().notNull(),
  commitMessage: varchar({ length: 500 }),
}, (table) => [
  index().on(table.author),
  index().on(table.entity),
]);
