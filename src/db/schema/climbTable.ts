import { gte, sql } from 'drizzle-orm';
import { check } from 'drizzle-orm/gel-core';
import {
  boolean,
  integer,
  jsonb,
  PgColumn,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { Constraint } from './constraints';
import { entityTable } from './entitiy';
import { gradeTable } from './gradeTable';

export const safetyEnum = pgEnum('climb_safety_enum', [
  'UNSPECIFIED',
  'PG',
  'PG13',
  'runout',
  'terrain',
  'R',
  'X',
]);

export const climbTable = pgTable('climb', {
  entityId: integer().primaryKey().references(() => entityTable.id, {
    onDelete: 'cascade',
  }),
  fa: varchar({ length: 255 }),
  length: integer().notNull(),
  boltsCount: integer(),
  type: jsonb().notNull(),
  safety: safetyEnum(),
  canonicalGrade: integer().references(() => gradeTable.id),
}, (table) => [
  check(
    Constraint.NoEntitySelfReference,
    sql`${table.entityId} is not null`,
  ),
  check(
    Constraint.BoltCountPositive,
    gte(table.boltsCount, 0),
  ),
]);
