import { QueryResolvers, Resolvers } from '@gql';
import * as schema from '@schema';
import { and, eq, getTableColumns, not } from 'drizzle-orm';

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

  ancestors: async (parent, _, context) => [],
  pathTokens: async (parent, _, context) => [],
  gradeContext: async (parent, _, context) => 'OOPS',

  mediaPagination: async () => {
    throw 'not implemented';
  },
  authorMetadata: async () => {
    throw 'not implemented';
  },
  imageByteSum: async () => {
    throw 'not implemented';
  },
  organizations: async () => {
    throw 'not implemented';
  },
};
