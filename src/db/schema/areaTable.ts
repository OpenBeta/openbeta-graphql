import { sql } from 'drizzle-orm';
import { check } from 'drizzle-orm/gel-core';
import {
  boolean,
  integer,
  jsonb,
  PgColumn,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { Constraint } from './constraints';
import { entityTable } from './entitiy';

export const areaTable = pgTable('area', {
  entityId: integer()
    .primaryKey()
    .references(() => entityTable.id, {
      onDelete: 'cascade',
    }),
  shortCode: varchar({ length: 50 }),
  gradeContext: varchar({ length: 50 }).notNull(),
  density: real().notNull(),
  totalClimbs: integer().notNull(),
  imageByteSum: integer().notNull().default(0),
});
