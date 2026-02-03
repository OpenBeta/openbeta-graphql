import { check } from 'drizzle-orm/gel-core';
import {
  boolean,
  integer,
  pgTable,
  real,
  unique,
  uniqueKeyName,
  varchar,
} from 'drizzle-orm/pg-core';
import { Constraint } from './constraints';
import { entityCompositionColumns } from './entitiy';
import { gradeSystemTable } from './gradeTable';

export const areaTable = pgTable('area', {
  ...entityCompositionColumns,
  name: varchar({ length: 255 }).notNull(),
  shortCode: varchar({ length: 50 }),
  density: real().notNull().default(0),
  totalClimbs: integer().notNull().default(0),
  imageByteSum: integer().notNull().default(0),
  isDestination: boolean().notNull().default(false),
});

export const areaGradeContext = pgTable('area_grade_context', {
  area: integer()
    .notNull()
    .references(() => areaTable.id, { onDelete: 'cascade' }),
  context: integer()
    .notNull()
    .references(() => gradeSystemTable.id, {
      onDelete: 'cascade',
    }),
}, (table) => [
  unique(Constraint.DuplicateGradeContext).on(table.area, table.context),
]);
