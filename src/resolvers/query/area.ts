import { Area, Resolvers } from '@gql';
import { entity } from '@schema';
import { areaTable } from 'db/schema/areaTable';
import { and, eq, ilike, isNull } from 'drizzle-orm';
import { Context } from 'server/context';

function require<T>(x: T | undefined | null) {
  if (x === undefined || x === null) {
    throw new Error('require failure: the value was nullish');
  }

  return x;
}
const query: Resolvers['Query'] = {
  area: async (parent, args, context, info) =>
    await context.repo.area.get(require(args.uuid)),

  areas: async (parent, args, context, info) => {
    let filters = [];
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

      if (args.filter.field_compare) {
        throw new Error('eeeeh');
      }

      if (args.filter.leaf_status) {
        filters.push(eq(areaTable.isLeaf, args.filter.leaf_status.isLeaf));
      }

      if (args.filter.path_tokens) {
        // This approach is simple enough in theory,
        // I'm going to leave it for now because it's
        // not a good approach in general - though we can
        // quite easily create a path view if it's needed.
        throw new Error('too lazy right now');
      }
    }
    throw new Error('Not implemented');
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
    // Forgive me for the quick map operation here,
    // but there only a fixed number of countries you know?
    context
      .db
      .select({ ent: entity, area: areaTable })
      .from(entity)
      .innerJoin(areaTable, eq(entity.id, areaTable.id))
      .where(
        and(
          eq(
            entity.entityType,
            'area',
          ),
          isNull(entity.parent),
        ),
      )
      .then((rows) => rows.map((a) => ({ ...a.ent, ...a.area }))),
};

export default query;
