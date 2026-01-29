import { boolean, integer, pgTable, real, varchar } from 'drizzle-orm/pg-core';
import { entityCompositionColumns } from './entitiy';

export const areaTable = pgTable('area', {
  ...entityCompositionColumns,
  name: varchar({ length: 255 }).notNull(),
  shortCode: varchar({ length: 50 }),
  gradeContext: varchar({ length: 50 }).notNull(),
  density: real().notNull().default(0),
  totalClimbs: integer().notNull().default(0),
  imageByteSum: integer().notNull().default(0),
  isLeaf: boolean().notNull().default(true),
  isDestination: boolean().notNull().default(false),
});
