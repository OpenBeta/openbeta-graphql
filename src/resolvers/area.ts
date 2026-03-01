import {
  AggregateType,
  AuthorMetadata,
  CountByDisciplineType,
  DisciplineStatsType,
  QueryResolvers,
  Resolvers,
} from '@gql';
import * as schema from '@schema';
import { authorMetadata } from 'beta/authorMetadataResolver';
import { contentByTag, resolveContent } from 'beta/contentResolvers';
import { EntityId } from 'beta/entity_model';
import { HasCacheableLineage, requireAncestry } from 'beta/lineage';
import { AreaPrimitive } from 'beta/repo/area';
import { ClimbPrimitive } from 'beta/repo/climb';
import { ancestors } from 'beta/repo/entity_cte';
import { mediaConnection } from 'beta/repo/media';
import {
  and,
  count,
  desc,
  eq,
  exists,
  getTableColumns,
  not,
} from 'drizzle-orm';
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
      lat: parent.location?.y,
      lng: parent.location?.x,
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
      ) as Promise<ClimbPrimitive[]>,

  ancestors: async (parent, _, context) =>
    await requireAncestry(parent, context).then((d) =>
      d.map((o) => String(o.uuid))
    ),

  pathTokens: async (parent, _, context) =>
    await requireAncestry(parent, context).then((d) => d.map((o) => o.name)),

  pathHash: async (parent, _, context) => {
    // TODO: What hashing should we actually be doing?
    const path = await requireAncestry(parent, context).then((d) =>
      d.map((o) => o.name)
    );
    return path.join('#');
  },

  gradeContext: async (parent, _, context) => {
    return await context
      .db
      .select({ name: schema.gradeSystem.name })
      .from(schema.areaGradeContext)
      .innerJoin(
        schema.gradeSystem,
        eq(schema.areaGradeContext.context, schema.gradeSystem.id),
      )
      .where(eq(schema.areaGradeContext.area, parent.id))
      .limit(1)
      .then((row) => String(row[0]?.name || 'YDS'));
  },

  mediaPagination: async (parent, { input }, context) => {
    const connection = await mediaConnection(context.db, parent, {
      first: input?.first,
      after: input?.after,
    });

    return {
      areaUuid: parent.uuid,
      mediaConnection: connection,
    };
  },

  imageByteSum: async (parent) => {
    // TODO: The complexity of keeping this image byte
    // sum denomalized field up to date is definitely a pain.
    // It may well be easier and just as fast to simply query a sum of image
    // sizes for a given area since we have a solid index for descendants.
    return parent.imageByteSum;
  },

  organizations: async () => {
    return [];
  },

  aggregate: async (areaNode, _, context, info) => {
    const selection = parseResolveInfo(info)?.fieldsByTypeName ?? {};
    const data: AggregateType = {};

    if ('CountByDisciplineType' in selection) {
      // Sum climb disciplines within this area
      data.byDiscipline = {};
      await context
        .db
        .select({ discipline: schema.climb.type, sum: count() })
        .from(schema.entityAncestors)
        .innerJoin(
          schema.entity,
          eq(schema.entityAncestors.entityId, schema.entity.id),
        )
        .innerJoin(schema.climb, eq(schema.entity.id, schema.climb.id))
        .where(
          and(
            eq(schema.entityAncestors.ancestorId, areaNode.id),
            eq(schema.entity.entityType, 'climb'),
            not(schema.entity.deleted),
          ),
        )
        .then((rows) =>
          rows.forEach((row) => {
            if (row.discipline == 'top_rope') {
              // @ts-ignore
              row.discipline = 'tr';
            }

            // @ts-ignore
            data.byDiscipline[row.discipline as keyof CountByDisciplineType] = {
              total: row.sum,
              bands: {
                unknown: 0,
                beginner: 0,
                intermediate: 0,
                advanced: 0,
                expert: 0,
              },
            } satisfies DisciplineStatsType;
          })
        );
    }

    return data;
  },

  totalClimbs: async (areaNode, _, context) =>
    context
      .db
      .select({ count: count() })
      .from(schema.entityAncestors)
      .innerJoin(
        schema.entity,
        eq(
          schema.entity.id,
          schema.entityAncestors.entityId,
        ),
      )
      .where(
        and(
          not(schema.entity.deleted),
          eq(schema.entity.entityType, 'climb'),
          eq(schema.entityAncestors.ancestorId, areaNode.id),
        ),
      )
      .then((d) => d[0].count),

  content: resolveContent('AreaContent'),
  authorMetadata,
};
