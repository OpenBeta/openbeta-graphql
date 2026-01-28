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

export const entityKind = pgEnum('entity_type', [
  'area',
  'climb',
  'pitch',
  'content',
]);

/**
 * 'Entities' within the openbeta system are principally data that we
 * we would like to have a set of common shared behaviors that we can
 * achieve via composition here.
 *
 * Entities may have a name, though you may choose for multiple reasons
 * To compose the entity with an additional name field that narrows the
 * type constraint. For example, climbs would pretty much always have a
 * name.
 */
export const entityTable = pgTable('entity', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid().notNull().defaultRandom(),
  entityType: entityKind().notNull(),
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
