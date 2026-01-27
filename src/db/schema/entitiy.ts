import { sql } from 'drizzle-orm';
import { check } from 'drizzle-orm/gel-core';
import {
  boolean,
  integer,
  PgColumn,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { Constraint } from './constraints';

export const entityType = pgEnum('entity_type', [
  'area',
  'climb',
  'pitch',
  'content',
]);

/** */
export const entityTable = pgTable('entity', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid().notNull().defaultRandom(),
  entityType: entityType().notNull(),
  name: varchar({ length: 255 }),
  created: timestamp().notNull().defaultNow(),
  deleted: boolean().notNull().default(false),
  locked: boolean().notNull().default(false),
  parent: integer()
    .references((): PgColumn => entityTable.id, {
      onDelete: 'restrict',
    }),
}, (table) => [
  check(
    Constraint.NoEntitySelfReference,
    sql`${table.parent} is null or {table.id} != ${table.parent}`,
  ),
]);
