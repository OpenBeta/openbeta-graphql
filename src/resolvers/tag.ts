import { Resolvers } from '@gql';
import * as schema from '@schema';
import { EntityId } from 'beta/entity_model';
import { requireAncestry } from 'beta/lineage';
import { AreaPrimitive } from 'beta/repo/area';
import { ClimbPrimitive } from 'beta/repo/climb';
import { eq, getTableColumns, InferSelectModel } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export type EntityTagRecord =
  & InferSelectModel<typeof schema.tag>
  & Partial<{
    __area: { id: EntityId; name: string | null };
    __climb: { id: EntityId; name: string };
  }>;

export const entityTagResolvers: Resolvers['EntityTag'] = {
  targetId: async (parent) => parent.targetId as any,
  type: async (parent) => parent.targetEntityKind == 'climb' ? 0 : 1,

  areaName: async (parent, _, context) => {
    if (parent.__area === undefined) {
      if (parent.targetEntityKind !== 'area') {
        const p = alias(schema.entity, 'parent');

        parent.__area = await context
          .db
          .select(
            { ...getTableColumns(p) },
          )
          .from(schema.entity)
          .innerJoin(p, eq(schema.entity.parent, p.id))
          .where(
            eq(schema.entity.id, parent.targetId),
          )
          .then((x) => x[0]);
      } else {
        parent.__area = await context
          .db
          .select()
          .from(schema.area)
          .where(
            eq(schema.area.id, parent.targetId),
          )
          .then((x) => x[0]);
      }
    }
    return parent.__area?.name ?? 'no name found';
  },

  climbName: async (parent, _, context) => {
    if (parent.__climb === undefined) {
      parent.__climb = await context
        .db
        .select()
        .from(schema.climb)
        .where(
          eq(schema.climb.id, parent.targetId),
        )
        .then((x) => x[0]);
    }
    return parent.__climb?.name ?? null;
  },

  ancestors: async (parent, _, context) =>
    await requireAncestry(parent, context).then((d) =>
      d.map((o) => String(o.uuid)).join(',')
    ),

  lng: async () => {
    throw new Error('Not implemented');
  },

  lat: async () => {
    throw new Error('Not implemented');
  },

  topoData: async () => {
    return {};
    throw new Error('Not implemented');
  },
};
