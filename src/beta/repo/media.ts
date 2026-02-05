import {
  entity,
  EntityKind,
  history,
  historyEventEnum,
  Transaction,
} from '@schema';
import * as schema from '@schema';
import { Database } from '@schema';
import { Actor } from 'beta/actor';
import { EntityCompBaseTable, entityTable } from 'db/schema/entitiy';
import {
  and,
  count,
  eq,
  getTableColumns,
  gt,
  type InferInsertModel,
  InferSelectModel,
  sql,
  SQLChunk,
} from 'drizzle-orm';
import { AnyPgTable, PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { ActorError } from '../actor';
import {
  EntityAddressable,
  EntityId,
  EntityIdentifiable,
  EntityRecord,
} from '../entity_model';
import { createEntity } from './creationLogic';
import { collapseAddressable, matchOnAddressable } from './entityTools';

export type MediaRecord = InferSelectModel<typeof schema.media>;

export async function mediaConnection(
  db: Database | Transaction,
  ent: EntityAddressable,
  { first = 10, after }: { first?: number | null; after?: string | null },
) {
  const entityId = await collapseAddressable(db, ent);
  const limit = first || 10;

  const results = await db
    .select({ ...getTableColumns(schema.media) })
    .from(schema.entityAncestors)
    .innerJoin(
      schema.tag,
      eq(schema.tag.targetId, schema.entityAncestors.entityId),
    )
    .innerJoin(schema.media, eq(schema.media.id, schema.tag.mediaId))
    .where(
      and(
        eq(schema.entityAncestors.ancestorId, entityId),
        after ? gt(schema.media.id, parseInt(after)) : undefined,
      ),
    )
    .groupBy(schema.media.id)
    .orderBy(schema.media.id)
    .limit(limit + 1);

  const hasNextPage = results.length > limit;
  const nodes = results.slice(0, limit);

  const [{ count: totalItems }] = await db
    .select({ count: count(sql`DISTINCT ${schema.media.id}`) })
    .from(schema.entityAncestors)
    .innerJoin(
      schema.tag,
      eq(schema.tag.targetId, schema.entityAncestors.entityId),
    )
    .innerJoin(schema.media, eq(schema.media.id, schema.tag.mediaId))
    .where(eq(schema.entityAncestors.ancestorId, entityId));

  return {
    edges: nodes.map((node) => ({
      node,
      cursor: node.id.toString(),
    })),
    pageInfo: {
      hasNextPage,
      totalItems: Number(totalItems),
      endCursor: nodes.length > 0
        ? nodes[nodes.length - 1].id.toString()
        : null,
    },
  };
}
