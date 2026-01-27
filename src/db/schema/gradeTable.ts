import {
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
  'trad',
  'dws',
  'ice',
  'aid',
]);

export const gradeSystemTable = pgTable('grade_system', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  discipline: disciplineEnum().notNull(),
}, (table) => [
  unique(Constraint.GradeSystemNameUnique).on(table.name, table.discipline),
]);

export const gradeTable = pgTable('grade', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  system: integer().notNull().references(() => gradeSystemTable.id),
  value: varchar({ length: 50 }).notNull(),
}, (table) => [
  unique(Constraint.GradeValueDuplicate).on(table.system, table.value),
]);

export const gradePegTable = pgTable('grade_peg_table', {
  system: integer().notNull().references(() => gradeSystemTable.id),
  grade: integer().notNull().references(() => gradeTable.id),
  peg: integer().notNull(),
}, (table) => [
  primaryKey({ columns: [table.system, table.grade] }),
]);
