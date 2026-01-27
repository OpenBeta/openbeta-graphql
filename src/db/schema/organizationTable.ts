import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const organizationTable = pgTable('organization', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orgId: uuid().notNull().defaultRandom().unique(),
  orgType: varchar({ length: 50 }).notNull(),
  associatedAreaIds: uuid(),
  excludedAreaIds: uuid(),
  displayName: varchar({ length: 255 }).notNull(),
  content: jsonb(),
  createdAt: timestamp().notNull().defaultNow(),
  createdBy: uuid(),
  updatedAt: timestamp().notNull().defaultNow(),
  updatedBy: uuid(),
});