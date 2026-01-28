import { entity, EntityKind, Transaction } from '@schema';
import { entityTable } from 'db/schema/entitiy';
import {
  Column,
  ColumnBaseConfig,
  ColumnDataType,
  eq,
  InferInsertModel,
  InferSelectModel,
  or,
  Table,
  TableConfig,
} from 'drizzle-orm';
import { UUIDTypes } from 'uuid';
import { ActorIdentifiable } from './actor';
import { EntityIdentifiable } from './entity_model';

export type EntityAddressable = number | UUIDTypes | EntityIdentifiable;
export type TableWithId = Table & {
  id: Column;
};

function matchOnAddressable(ent: EntityAddressable) {
  if (typeof ent == 'number') {
    return eq(entity.id, ent);
  }

  if (typeof ent === 'object' && 'id' in ent) {
    return matchOnAddressable(ent.id);
  }

  if (typeof ent == 'string') {
    return eq(entity.uuid, ent);
  }

  throw new Error(
    `we don't have a code path to collapse < ${ent} > into an sql match clause`,
  );
}

export abstract class EntityRepository<Ent extends EntityIdentifiable> {
  abstract kind: EntityKind;
  abstract table: TableWithId;

  tx: Transaction;
  actor: ActorIdentifiable;

  constructor(
    db: Transaction,
    actor: ActorIdentifiable,
  ) {
    this.tx = db;
    this.actor = actor;
  }

  private insertionCTE(
    using: Omit<InferInsertModel<typeof entity>, 'entityType'>,
  ) {
    return this.tx.$with('reify_entity').as(
      this
        .tx
        .insert(entity)
        .values({ ...using, entityType: this.kind })
        .returning(),
    );
  }

  abstract captureBaseFields(
    from: Omit<Ent, 'id'>,
  ): Omit<InferInsertModel<typeof entity>, 'entityType'>;

  abstract mapResultToEntity(result: InferSelectModel<typeof this.table>): Ent;

  async create(ent: Omit<Ent, 'id'>): Promise<Ent> {
    return this.mapResultToEntity(
      await this
        .tx
        .with(this.insertionCTE(this.captureBaseFields(ent)))
        .insert(this.table)
        .values({})
        .returning(),
    );
  }

  async update(ent: Ent): Promise<void> {
    throw new Error('Not Implemented');
  }

  async get(ent: EntityAddressable): Promise<Ent> {
    return this.mapResultToEntity(
      this
        .tx
        .select()
        .from(this.table)
        .innerJoin(
          entityTable,
          eq(entityTable.id, this.table.id),
        )
        .where(matchOnAddressable(ent))
        .limit(1),
    );
  }

  async setLock(ent: EntityAddressable, locked: boolean): Promise<void> {
    throw new Error('Not Implemented');
  }

  async setParent(
    ent: EntityAddressable,
    parent: EntityAddressable,
  ): Promise<void> {
    throw new Error('Not Implemented');
  }

  async softDelete(ent: EntityAddressable): Promise<void> {
    throw new Error('Not Implemented');
  }

  async unDelete(ent: EntityAddressable): Promise<void> {
    throw new Error('Not Implemented');
  }
}
