import {
  ColumnBaseConfig,
  InferSelectModel,
  type IsPrimaryKey,
  type NotNull,
  sql,
  TableConfig,
} from 'drizzle-orm';
import {
  AnyPgTable,
  boolean,
  check,
  index,
  integer,
  PgColumn,
  PgColumnBuilder,
  pgEnum,
  type PgIntegerBuilder,
  pgTable,
  PgTableWithColumns,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { Constraint } from './constraints';

export const entityKind = pgEnum('entity_type', [
  'area',
  'climb',
  'pitch',
  'content',
]);

export type EntityKind = InferSelectModel<typeof entityTable>['entityType'];

/**
 * 'Entities' within the openbeta system are principally data that we
 * we would like to have a set of common shared behaviors that we can
 * achieve via composition here.
 *
 * Entities may have a name, though you may choose for multiple reasons
 * To compose the entity with an additional name field that narrows the
 * type constraint. For example, climbs would pretty much always have a
 * name.
 */
export const entityTable = pgTable('entity', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid().notNull().defaultRandom(),
  entityType: entityKind().notNull(),
  name: varchar({ length: 255 }),
  created: timestamp().notNull().defaultNow(),
  deleted: boolean().notNull().default(false),
  locked: boolean().notNull().default(false),
  parent: integer()
    .references((): PgColumn => entityTable.id, {
      onDelete: 'restrict',
    }),
}, (table) => [
  // We disallow an entity from telling us that IT is its own parent
  check(
    Constraint.NoEntitySelfReference,
    sql`${table.parent} is null or ${table.id} != ${table.parent}`,
  ),
  index('parent_idx').on(table.parent),
  uniqueIndex('uuid_idx').on(table.uuid),
  index('entity_kind_idx').on(table.entityType),
]);

export const entityCompositionColumns = {
  id: integer('id')
    .primaryKey()
    .references(() => entityTable.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
};

export type EntityCompBaseTable<N extends string = string> = PgTableWithColumns<
  {
    name: N;
    schema: undefined;
    dialect: 'pg';
    columns: { 'id': PgColumn<ColumnBaseConfig<'number', 'PgInteger'>> };
  }
>;
