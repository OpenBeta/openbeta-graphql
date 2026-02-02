import { integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { entityTable } from './entitiy';
import { mediaTable } from './mediaTable';

/**
All logic pertaining to tagging has to do with connecting media to
one or more openbeta entities. We make no assumptions about the
validity or nature of the media, we simply connect them up
*/
export const tagTable = pgTable('tag', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  mediaId: integer()
    .references(() => mediaTable.id, {
      onDelete: 'cascade',
    }),
  targetId: integer().notNull().references(() => entityTable.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp().notNull().defaultNow(),
});
