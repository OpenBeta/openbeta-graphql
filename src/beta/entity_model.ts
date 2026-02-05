import {
  Database,
  entity,
  EntityCompBaseTable,
  EntityKind,
  Transaction,
} from '@schema';
import {
  Column,
  ColumnBaseConfig,
  InferInsertModel,
  InferSelectModel,
  Table,
  TableConfig,
} from 'drizzle-orm';
import { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { UUIDTypes } from 'uuid';
import { Actor } from './actor';

export type EntityId = number;

export interface EntityIdentifiable {
  id: EntityId;
}

export interface EntityStructure extends EntityIdentifiable {
  parent: EntityId | null;
}

export interface EntityWithParent extends EntityStructure {
  parent: EntityId;
}

export function validateParent(
  x: any,
): x is EntityWithParent {
  return typeof x.parent == 'number';
}

export interface Entity
  extends EntityIdentifiable, InferSelectModel<typeof entity>
{}

export type EntityAddressable = number | UUIDTypes | EntityIdentifiable;
export type EntityRecord = InferSelectModel<typeof entity>;

export interface EntityRepoBase<EntTable extends EntityCompBaseTable> {
  readonly kind: EntityKind;
  readonly table: EntTable;
  readonly db: Transaction | Database;
}

export class EntityError extends Error {}
