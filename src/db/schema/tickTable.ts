import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { onTestFailed } from 'vitest';
import { climbTable } from './climbTable';
import { gradeSystemTable } from './gradeTable';
import { userTable } from './userTable';

export const tickSourceEnum = pgEnum('tick_source', [
  'OB',
  'MP',
]);

export const tickAttemptTypeEnum = pgEnum('tick_attempt_type', [
  'Onsight',
  'Flash',
  'Pinkpoint',
  'Frenchfree',
  'Attempt',
  'Send',
  'Redpoint',
  'Repeat',
]);

export const tickStyleEnum = pgEnum('tick_style', [
  'Lead',
  'Solo',
  'TR',
  'Follow',
  'Aid',
  'Boulder',
]);

export const tickTable = pgTable('tick', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().references(() => userTable.id, {
    onDelete: 'cascade',
  }),
  name: varchar({ length: 255 }).notNull(),
  climbId: varchar({ length: 255 }).notNull(),
  climb: integer().references(() => climbTable.id, { onDelete: 'set null' }),
  grade: integer().references(() => gradeSystemTable.id, {
    onDelete: 'set null',
  }),
  style: tickStyleEnum(),
  notes: text(),
  attemptType: tickAttemptTypeEnum(),
  dateClimbed: timestamp().notNull(),
  freeformGrade: varchar({ length: 50 }),
  source: tickSourceEnum().notNull().default('OB'),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});
