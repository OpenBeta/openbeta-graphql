import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('entity', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
});
