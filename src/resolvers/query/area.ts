import { Area, Resolvers } from '@gql';
import { Context } from 'server/context';

function require<T>(x: T | undefined | null) {
  if (x === undefined || x === null) {
    throw new Error('require failure: the value was nullish');
  }

  return x;
}
const query: Resolvers['Query'] = {
  area: async (parent, args, context, info) => {
    return await context.repo.area.get(require(args.uuid));
  },
  areas: async (parent, args, context, info) => {
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
  countries: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },
};

export default query;
