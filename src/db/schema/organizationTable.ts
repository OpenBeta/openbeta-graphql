import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { areaTable } from './areaTable';
import { entityCompositionColumns } from './entitiy';
import { userTable } from './userTable';

export const organizationTable = pgTable('organization', {
  ...entityCompositionColumns,
  orgType: varchar({ length: 50 }).notNull(),
  displayName: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const organizationMemberTable = pgTable('organization_member', {
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizationTable.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => userTable.id, { onDelete: 'cascade' }),
  role: varchar({ length: 50 }).notNull().default('member'),
  createdAt: timestamp().notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.organizationId, table.userId] }),
]);

export const organizationAreaTable = pgTable('organization_area', {
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizationTable.id, { onDelete: 'cascade' }),
  areaId: integer('area_id')
    .notNull()
    .references(() => areaTable.id, { onDelete: 'cascade' }),
  isExclusion: boolean('is_exclusion').notNull().default(false),
  createdAt: timestamp().notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.organizationId, table.areaId] }),
]);
