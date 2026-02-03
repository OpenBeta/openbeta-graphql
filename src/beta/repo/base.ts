import { Database, entity, EntityKind, Transaction } from '@schema';
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
import { printError } from 'graphql';
import { Actor, ActorError } from '../actor';
import {
  EntityAddressable,
  EntityId,
  EntityIdentifiable,
  EntityRecord,
} from '../entity_model';
import { MediaRecord } from './media';

function matchOnAddressable(ent: EntityAddressable) {
  if (typeof ent == 'number') {
    return eq(entity.id, ent);
  }

  if (typeof ent == 'string') {
    return eq(entity.uuid, ent);
  }

  if (typeof ent === 'object' && 'id' in ent) {
    return matchOnAddressable(ent.id);
  }

  if (typeof ent === 'object' && 'uuid' in ent) {
    return matchOnAddressable(ent.uuid as any);
  }

  throw new Error(
    `we don't have a code path to collapse < ${ent} > into an sql match clause`,
  );
}

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
  private readonly actor: Actor | null;

  constructor(
    db: Transaction | Database,
    actor: Actor | null,
  ) {
    this.db = db;
    this.actor = actor;
  }

  /**
  Sometimes, though not necessarily always, you may want to forward some
  fields directly from the entity creation request into the backing
  `entity` table. in this instance, you can extend this function in your
  subclass such that any fields you like can be forwarded to the entity
  reification.

  Note than under no circumstances should you be trying to set an id
  or an entity type here, the id is supposed to be generated and the entity
  type is supposed to be contextually locked.
  */
  captureBaseFields(
    from: EntCreation,
  ): Partial<Omit<EntityRecord, 'entityType'>> {
    if ('name' in from) {
      return {
        name: from['name'] as string,
      };
    }

    return {};
  }

  abstract mapJoinedToCombined(
    result: { entity: EntityRecord; parts: EntSelection },
  ): Ent;

  private requireActor(): Actor {
    if (this.actor == null) {
      throw new Error('You MUST be logged in and authenticated to do this');
    }

    return this.actor;
  }

  private async collapseAddressable(ent: EntityAddressable): Promise<EntityId> {
    if (typeof ent == 'number') {
      return ent;
    }

    if (typeof ent === 'object' && 'id' in ent) {
      return ent.id;
    }

    return await this.get(ent).then((d) => d.id);
  }

  async create(data: EntCreation): Promise<Ent> {
    // if there were any constraints you wanted to check here that are infeasible for
    // our sql engine they could go nicely here in your subclassing.
    const columns: SQLChunk[] = [];
    const values: SQLChunk[] = [];
    const entityColumns = [
      entity.entityType,
      entity.name,
      entity.parent,
    ]
      .map((
        col,
      ) => sql.identifier(col.name));

    //
    columns.push(sql.identifier(this.table.id.name));
    values.push(sql`"reify_entity"."id"`);

    for (const column in getTableColumns(this.table)) {
      if (column in data && data[column] !== undefined) {
        columns.push(sql.identifier(column));
        values.push(sql`${data[column]}`);
      }
    }

    if (data.parent === undefined || data.parent === null) {
      throw new Error(
        'For now, we are assuming that entities must have parents',
      );
    }

    const query = sql`
      with reify_entity as (
        insert into "entity" ${entityColumns}
        values (${this.kind}, ${data.name}, ${data.parent})
        returning id
      ),
      insert_extra as (insert into ${this.table} ${columns}
      select ${sql.join(values, sql`, `)} from "reify_entity"
      )
      select * from reify_entity
    `;

    let reified = await this.db.execute<Pick<EntSelection, 'id'>>(query);

    return await this.get({ id: reified.rows[0].id as EntityId });
  }

  async update(
    ent: EntityAddressable,
    changes: PgUpdateSetSource<EntTable>,
  ): Promise<void> {
    if (!await this.requireActor().mayEdit(ent)) {
      throw new ActorError(
        `This user is not permitted to alter this entity`,
      );
    }

    // This is where document history would be taken care of.
    // because we are inside a transaction the order is not super
    // important because exceptions anywhere in the stack
    // would cause rollback.

    await this
      .db
      .update(this.table)
      .set(changes)
      .where(matchOnAddressable(ent));
  }

  async get(ent: EntityAddressable): Promise<Ent> {
    return this.mapJoinedToCombined(
      await this
        .db
        .select({
          entity: entityTable,
          parts: this.table,
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
          return r;
        }),
    );
  }

  async setLock(ent: EntityAddressable, locked: boolean): Promise<void> {
    if (!await this.requireActor().maySetLock(ent)) {
      throw new ActorError(
        `This user is not permitted to set lock-state of entity`,
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
          await this.collapseAddressable(ent),
        ),
      )
      .groupBy(schema.media.id)
      .limit(100);
  }
}
