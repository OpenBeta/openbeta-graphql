import { gte, sql } from 'drizzle-orm';
import { check } from 'drizzle-orm/gel-core';
import {
  geometry,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  varchar,
} from 'drizzle-orm/pg-core';
import { Constraint } from './constraints';
import { entityCompositionColumns, entityTable } from './entitiy';
import { disciplineEnum, gradeTable } from './gradeTable';

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
  ...entityCompositionColumns,
  name: varchar({ length: 255 }).notNull(),
  fa: varchar({ length: 255 }),
  length: integer().notNull(),
  boltsCount: integer(),
  type: disciplineEnum().notNull(),
  safety: safetyEnum(),
  canonicalGrade: integer().references(() => gradeTable.id),
  location: geometry('position', { mode: 'xy', srid: 4326 }),
}, (table) => [
  check(
    Constraint.BoltCountPositive,
    gte(table.boltsCount, 0),
  ),
]);
