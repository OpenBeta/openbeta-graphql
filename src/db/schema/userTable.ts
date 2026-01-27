import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userTable = pgTable('user', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid().notNull().defaultRandom().unique(),
  username: varchar({ length: 50 }).notNull().unique(),
  displayName: varchar({ length: 255 }),
  bio: text(),
  website: varchar({ length: 500 }),
  email: varchar({ length: 255 }).notNull().unique(),
  avatar: varchar({ length: 500 }),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});
