import { QueryResolvers, Resolvers } from '@gql';
import * as schema from '@schema';
import { AreaPrimitive } from 'beta/repo/area';
import { countDescendants } from 'beta/repo/entity_cte';
import { and, count, eq, getTableColumns, not } from 'drizzle-orm';
import { UUIDTypes } from 'uuid';

export type PartiallyResolvedArea =
  & AreaPrimitive
  & Partial<{
    __cachedLineage: { id: number; uuid: UUIDTypes; name: string }[];
  }>;

export const areaResolvers: Resolvers['Area'] = {
  id: async (parent) => parent.uuid,
  area_name: async (parent) => parent.name,
  areaName: async (parent) => parent.name,
  children: async (parent, info, context) =>
    context
      .db
      .select({
        ...getTableColumns(schema.entity),
        ...getTableColumns(schema.area),
      })
      .from(schema.area)
      .innerJoin(schema.entity, eq(schema.entity.id, parent.id))
      .where(and(eq(schema.area.id, parent.id), not(schema.entity.deleted))),

  metadata: async (parent) => ({
    areaId: parent.uuid,
    area_id: parent.uuid,
    leaf: parent.isLeaf,
    isDestination: parent.isDestination,
    mp_id: '',
  }),

  media: async (parent, _, context) => context.repo.area.media(parent),

  climbs: async (parent, _, context) =>
    context
      .db
      .select({
        ...getTableColumns(schema.entity),
        ...getTableColumns(schema.climb),
      })
      .from(schema.climb)
      .innerJoin(schema.entity, eq(schema.entity.id, parent.id))
      .where(
        and(
          eq(schema.entity.parent, parent.id),
          not(
            schema
              .entity
              .deleted,
          ),
        ),
      ),

  ancestors: async (parent, _, context) => ['OOPS'],
  pathTokens: async (parent, _, context) => ['OOPS'],
  gradeContext: async (parent, _, context) => 'OOPS',

  mediaPagination: async () => {
    throw 'not implemented';
  },

  authorMetadata: async () => {
    return {};
  },

  imageByteSum: async () => {
    throw 'not implemented';
  },

  organizations: async () => {
    return [];
  },

  aggregate: async (parent, info, context) => {
    return {
      byGrade: [],
      byDiscipline: {},
      byGradeBand: {},
    };
  },

  totalClimbs: async (parent, _, context) =>
    context
      .db
      .select({ count: count() })
      .from(schema.entityAncestors)
      .innerJoin(
        schema.entity,
        eq(
          schema
            .entity
            .id,
          schema.entityAncestors.entityId,
        ),
      )
      .where(
        and(not(schema.entity.deleted), eq(schema.entity.entityType, 'climb')),
      )
      .then((d) => d[0].count),
};
