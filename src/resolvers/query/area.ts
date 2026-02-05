import { Area, Resolvers } from '@gql';
import * as schema from '@schema';
import { areaTable } from 'db/schema/areaTable';
import {
  and,
  BinaryOperator,
  eq,
  getTableColumns,
  gt,
  gte,
  ilike,
  isNull,
  lt,
  lte,
  not,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Context } from 'server/context';

function require<T>(x: T | undefined | null) {
  if (x === undefined || x === null) {
    throw new Error('require failure: the value was nullish');
  }

  return x;
}

const comparator: Record<string, BinaryOperator> = {
  'eq': eq,
  'gt': gt,
  'gte': gte,
  'lt': lt,
  'lte': lte,
};

const query: Resolvers['Query'] = {
  area: async (parent, args, context, info) =>
    await context.repo.area.get(require(args.uuid)),

  areas: async (parent, args, context, info) => {
    let filters = [];
    const child = alias(schema.entity, 'child');

    if (args.filter) {
      if (args.filter.area_name) {
        if (args.filter.area_name.exactMatch) {
          filters.push(
            ilike(areaTable.name, `%${args.filter.area_name.match}%`),
          );
        } else {
          filters.push(eq(areaTable.name, args.filter.area_name.match));
        }
      }

      const areaColumns = getTableColumns(schema.area);
      args.filter.field_compare?.forEach((field) => {
        const comparison = field?.comparison as string | undefined;
        const fieldName = field?.field as string | undefined;

        if (!fieldName || !comparison) {
          throw new Error('That does not look right, check field_compare');
        }

        if (!(fieldName in areaColumns)) {
          throw new Error(`Field ${fieldName} is not valid for filtering`);
        }

        // @ts-ignore
        const col = areaColumns[fieldName];

        filters.push(
          comparator[comparison](
            col,
            field?.num,
          ),
        );
      });

      if (args.filter.leaf_status?.isLeaf) {
        filters.push(isNull(child.id));
      }

      if (args.filter.path_tokens) {
        // This approach is simple enough in theory,
        // I'm going to leave it for now because it's
        // not a good approach in general - though we can
        // quite easily create a path view if it's needed.
        throw new Error('too lazy right now');
      }
    }

    return context
      .db
      .select({
        ...getTableColumns(schema.entity),
        ...getTableColumns(schema.area),
      })
      .from(schema.area)
      .innerJoin(
        schema.entity,
        eq(schema.entity.id, schema.area.id),
      )
      .leftJoin(
        child,
        and(
          sql`${args.filter?.leaf_status?.isLeaf || false}`,
          eq(child.parent, schema.area.id),
          eq(child.entityType, 'area'),
        ),
      )
      .where(and(...filters));
  },

  bulkAreas: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },

  stats: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },

  cragsNear: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },

  cragsWithin: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },

  countries: async (parent, args, context, info) =>
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
          isNull(schema.entity.parent),
          not(schema.entity.deleted),
        ),
      ),
};

export default query;
