import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { Constraint } from './constraints';

export const disciplineEnum = pgEnum('climbing_discipline', [
  'bouldering',
  'sport',
  'top_rope',
  'trad',
  'dws',
  'ice',
  'aid',
]);

export const gradeSystemTable = pgTable('grade_system', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
}, (table) => [
  unique(Constraint.GradeSystemNameUnique).on(table.name),
]);

export const gradeTable = pgTable('grade', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  system: integer().notNull().references(() => gradeSystemTable.id),
  value: varchar({ length: 50 }).notNull(),
  // At which point on the pegboard does this grade start?
  // It will be interpolated upward until another one is found
  pegValueLow: integer().notNull().default(0),
}, (table) => [
  unique(Constraint.GradeValueDuplicate).on(table.system, table.value),
  unique(Constraint.GradeValuePegLow).on(table.system, table.pegValueLow),
  index().on(table.system),
  index().on(table.value),
]);

export const gradePegTable = pgTable('grade_peg_table', {
  system: integer().notNull().references(() => gradeSystemTable.id),
  grade: integer().notNull().references(() => gradeTable.id),
  peg: integer().notNull(),
}, (table) => [
  primaryKey({ columns: [table.system, table.grade] }),
  index('single_peg_index').on(table.peg),
  index('grade_id_idx').on(table.grade),
  index('system_id_idx').on(table.system),
]);
