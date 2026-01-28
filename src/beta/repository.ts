import { entity, EntityKind, Transaction } from '@schema';
import { entityTable } from 'db/schema/entitiy';
import { eq, InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { Actor, ActorError } from './actor';
import {
  EntityAddressable,
  EntityIdentifiable,
  TableWithId,
} from './entity_model';

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
  actor: Actor;

  constructor(
    db: Transaction,
    actor: Actor,
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

  async update(
    ent: EntityAddressable,
    changes: InferInsertModel<typeof this.table>,
  ): Promise<void> {
    if (!await this.actor.mayEdit(ent)) {
      throw new ActorError(
        `This user is not permitted to alter this entity`,
      );
    }

    // This is where document history can be easily inserted

    await this
      .tx
      .update(this.table)
      .set(changes)
      .where(matchOnAddressable(ent));
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
    if (!await this.actor.maySetLock(ent)) {
      throw new ActorError(
        `This user is not permitted to set lock state of entity`,
      );
    }

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
