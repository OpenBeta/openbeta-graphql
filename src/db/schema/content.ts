import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { entityCompositionColumns, entityTable } from './entitiy';
import { userTable } from './userTable';

/**
Content is an entity type that may be ascociated with other entities,
or may even be ascociated with each other if it seems relevant.
*/
export const contentTable = pgTable('content', {
  ...entityCompositionColumns,
  text: text().notNull(),
  // Realistically this should be its own relation
  language: varchar({ length: 2 }).notNull().default('EN'),
});
