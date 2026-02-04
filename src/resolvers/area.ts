import { QueryResolvers, Resolvers } from '@gql';
import * as schema from '@schema';
import { contentByTag, resolveContent } from 'beta/contentResolvers';
import { EntityId } from 'beta/entity_model';
import { HasCacheableLineage, requireAncestry } from 'beta/lineage';
import { AreaPrimitive } from 'beta/repo/area';
import { ancestors } from 'beta/repo/entity_cte';
import { and, count, eq, exists, getTableColumns, not } from 'drizzle-orm';
import { parseResolveInfo } from 'graphql-parse-resolve-info';
import { Context } from 'server/context';
import { UUIDTypes } from 'uuid';

export type PartiallyResolvedArea =
  & AreaPrimitive
  & Partial<HasCacheableLineage>;

export const areaResolvers: Resolvers['Area'] = {
  id: async (parent) => parent.uuid,
  area_name: async (parent) => parent.name,
  areaName: async (parent) => parent.name,
  children: async (doc, info, context) =>
    context
      .db
      .select({
        ...getTableColumns(schema.entity),
        ...getTableColumns(schema.area),
      })
      .from(schema.area)
      .innerJoin(schema.entity, eq(schema.entity.id, schema.area.id))
      .where(
        and(
          eq(schema.entity.parent, doc.id),
          not(schema.entity.deleted),
        ),
      ),

  metadata: async (parent, _, context, info) => {
    const selection = parseResolveInfo(info);
    let leaf = false;

    if ('leaf' in (selection?.fieldsByTypeName.AreaMetadata ?? {})) {
      leaf = await context
        .db
        .select({ id: schema.entity.id })
        .from(
          schema.entity,
        )
        .where(
          and(
            eq(
              schema
                .entity
                .parent,
              parent.id,
            ),
            eq(schema.entity.entityType, 'area'),
          ),
        )
        .limit(1)
        .then((d) => d.length == 0);
    }

    return {
      areaId: parent.uuid,
      area_id: parent.uuid,
      leaf,
      isDestination: parent.isDestination,
      mp_id: '',
      leftRightIndex: 0,
      lat: parent.location?.x,
      lng: parent.location?.y,
    };
  },

  media: async (parent, _, context) => context.repo.area.media(parent),

  climbs: async (area, _, context) =>
    context
      .db
      .select({
        ...getTableColumns(schema.entity),
        ...getTableColumns(schema.climb),
      })
      .from(schema.climb)
      .innerJoin(schema.entity, eq(schema.entity.id, schema.climb.id))
      .where(
        and(
          eq(schema.entity.parent, area.id),
          not(
            schema
              .entity
              .deleted,
          ),
        ),
      ),

  ancestors: async (parent, _, context) =>
    await requireAncestry(parent, context).then((d) =>
      d.map((o) => String(o.uuid))
    ),

  pathTokens: async (parent, _, context) =>
    await requireAncestry(parent, context).then((d) => d.map((o) => o.name)),

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

  content: resolveContent('AreaContent'),
};
