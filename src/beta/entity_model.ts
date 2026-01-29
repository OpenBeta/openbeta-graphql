import { entity } from '@schema';
import {
  Column,
  ColumnBaseConfig,
  InferSelectModel,
  Table,
  TableConfig,
} from 'drizzle-orm';
import { UUIDTypes } from 'uuid';

export type EntityId = number;

export interface EntityIdentifiable {
  id: EntityId;
}

export interface EntityStructure extends EntityIdentifiable {
  parent: EntityId | null;
}

export interface Entity
  extends EntityIdentifiable, InferSelectModel<typeof entity>
{}

export type EntityAddressable = number | UUIDTypes | EntityIdentifiable;
export type EntityRecord = InferSelectModel<typeof entity>;
