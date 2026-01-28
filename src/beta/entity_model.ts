import { PgUUID } from 'drizzle-orm/pg-core';
import { UUIDTypes } from 'uuid';

export type EntityId = number;

export interface EntityIdentifiable {
  id: EntityId;
}

export interface EntityStructure extends EntityIdentifiable {
  parent: EntityId | null;
}

export interface Entity extends EntityIdentifiable, EntityStructure {
  name: string | null;
  deleted: boolean;
}
