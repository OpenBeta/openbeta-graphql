import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { userTable } from './userTable';

export const mediaTable = pgTable('media', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid().notNull().defaultRandom().unique(),
  author: integer()
    .references(() => userTable.id, {
      onDelete: 'cascade',
    }),

  // the assumption made about media with these fields will
  // cause us problems if we ever want to include data
  // representing objects like SVG and are less useful
  // for media like audio or video
  mediaUrl: varchar({ length: 2000 }).notNull(),
  width: integer().notNull(),
  height: integer().notNull(),
  format: varchar({ length: 10 }).notNull(),
  size: integer().notNull(),

  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});
