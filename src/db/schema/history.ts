import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { entityTable } from './entitiy';
import { userTable } from './userTable';

// Enum for history event types
export const historyEventEnum = pgEnum('history_event_type', [
  'ENTITY_CREATED',     // When a new entity is first created
  'ENTITY_EDITED',      // When an entity's details are modified
  'ENTITY_DELETED',     // When an entity is soft deleted
  'ENTITY_RESTORED',    // When a previously deleted entity is restored
  'ENTITY_LOCKED',      // When an entity is locked
  'ENTITY_UNLOCKED',    // When an entity is unlocked
  'ENTITY_PARENT_CHANGED', // When an entity's parent is changed
]);

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
  eventType: historyEventEnum('event_type'),
  editTime: timestamp().notNull().defaultNow(),
  before: jsonb(),
  after: jsonb().notNull(),
  commitMessage: varchar({ length: 500 }),
}, (table) => [
  index().on(table.author),
  index().on(table.entity),
  index().on(table.eventType),
]);
