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
  userId: integer().references(() => userTable.id, {
    onDelete: 'cascade',
  }),
  username: varchar({ length: 50 }),
  mediaUrl: varchar({ length: 500 }).notNull(),
  width: integer().notNull(),
  height: integer().notNull(),
  format: varchar({ length: 10 }).notNull(),
  size: integer().notNull(),
  uploadTime: timestamp().notNull().defaultNow(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});
