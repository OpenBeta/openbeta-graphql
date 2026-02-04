import { Database, entity, EntityKind, history, Transaction } from '@schema';
import * as schema from '@schema';
import { EntityCompBaseTable, entityTable } from 'db/schema/entitiy';
import {
  eq,
  getTableColumns,
  type InferInsertModel,
  InferSelectModel,
  sql,
  SQLChunk,
} from 'drizzle-orm';
import { AnyPgTable, PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { Actor, ActorError } from '../actor';
import {
  EntityAddressable,
  EntityId,
  EntityIdentifiable,
  EntityRecord,
} from '../entity_model';
import { createEntity } from './creationLogic';
import { collapseAddressable, matchOnAddressable } from './entityTools';
import { MediaRecord } from './media';

/**
The repository model is intended to reinforce the consistency of a handful of
shared behaviors between entities of different kinds.

The shared behaviors may include
  1. Permissions
  2. History / Audit trail
  3. Backed entity reification
  4. Entity Heirarchies (especially for those that are composed
      of different KINDS of parents and children)
  5. deletion and restoration logic.
 */
export abstract class EntityRepository<
  Ent extends EntityIdentifiable,
  EntTable extends EntityCompBaseTable,
  EntSelection extends InferSelectModel<EntTable> = InferSelectModel<EntTable>,
  EntCreation extends
    & Record<string, unknown>
    & Omit<InferInsertModel<EntTable>, 'id'>
    & Partial<InferInsertModel<typeof entity>> = InferInsertModel<
      EntTable
    >,
> {
  abstract readonly kind: EntityKind;
  abstract readonly table: EntTable;
  private readonly db: Transaction | Database;

  constructor(
    db: Transaction | Database,
  ) {
    this.db = db;
  }

  async create(
    actor: Actor,
    data: EntCreation,
    commitMessage?: string,
  ): Promise<Ent> {
    return await this.db.transaction(async (tx) => {
      const reifiedId = await createEntity<EntCreation, EntTable>(
        tx,
        this.table,
        this.kind,
        actor,
        data,
      );

      // Get the newly created entity
      const createdEntity = await this.get(reifiedId, tx);

      // Record creation in history
      await tx
        .insert(history)
        .values({
          author: actor.id,
          entity: createdEntity.id,
          before: null, // No previous state for new entity
          after: JSON.parse(JSON.stringify(createdEntity)),
          commitMessage: commitMessage || 'Entity Created',
        });

      return createdEntity;
    });
  }

  async update(
    actor: Actor,
    ent: EntityAddressable,
    changes: PgUpdateSetSource<EntTable>,
    commitMessage?: string,
  ): Promise<void> {
    if (!await actor.mayEdit(ent)) {
      throw new ActorError(
        `This user is not permitted to alter this entity`,
      );
    }

    await this.db.transaction(async (tx) => {
      const currentEntity = await this.get(ent);

      await tx
        .update(this.table)
        .set(changes)
        .where(matchOnAddressable(ent));

      await tx
        .insert(history)
        .values({
          author: actor.id,
          entity: currentEntity.id,
          before: JSON.parse(JSON.stringify(currentEntity)),
          after: JSON.parse(JSON.stringify({ ...currentEntity, ...changes })),
          commitMessage: commitMessage || null,
        });
    });
  }

  async get(ent: EntityAddressable, tx?: Transaction): Promise<Ent> {
    return await (tx || this.db)
      .select({
        ...getTableColumns(schema.entity),
        ...getTableColumns(this.table),
      })
      .from(entityTable)
      .innerJoin(
        this.table as AnyPgTable,
        eq(entityTable.id, this.table.id),
      )
      .where(matchOnAddressable(ent))
      .limit(1)
      .then(([r]) => {
        if (!r) {
          throw new Error(
            `The database did not resolve an entity for ${ent} (${typeof ent})`,
          );
        }
        return r as Ent;
      });
  }

  async setLock(
    actor: Actor,
    ent: EntityAddressable,
    locked: boolean,
  ): Promise<void> {
    if (!await actor.maySetLock(ent)) {
      throw new ActorError(
        `This user is not permitted to set lock-state of entity`,
      );
    }

    throw new Error('Not Implemented');
  }

  async setParent(
    actor: Actor,
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

  async media(ent: EntityAddressable): Promise<MediaRecord[]> {
    // All media in this box, and all of its descendants media
    return await this
      .db
      .select({ ...getTableColumns(schema.media) })
      .from(schema.entityAncestors)
      .innerJoin(
        schema.tag,
        eq(schema.tag.targetId, schema.entityAncestors.entityId),
      )
      .innerJoin(schema.media, eq(schema.media.id, schema.tag.mediaId))
      .where(
        eq(
          schema.entityAncestors.ancestorId,
          await collapseAddressable(this.db, ent),
        ),
      )
      .groupBy(schema.media.id)
      .limit(100);
  }
}
