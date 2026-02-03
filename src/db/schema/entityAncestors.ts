import {
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { entityTable } from './entitiy';

export const entityAncestorsTable = pgTable('entity_ancestors', {
  entityId: integer('entity_id').notNull().references(() => entityTable.id, {
    onDelete: 'cascade',
  }),
  ancestorId: integer('ancestor_id').notNull().references(
    () => entityTable.id,
    { onDelete: 'cascade' },
  ),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.entityId, table.ancestorId] }),
    entityIdIdx: index('entity_id_idx').on(table.entityId),
    ancestorIdIdx: index('ancestor_id_idx').on(table.ancestorId),
  };
});
