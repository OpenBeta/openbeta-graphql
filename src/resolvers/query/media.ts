import { Resolvers } from '@gql';
import * as schema from '@schema';
import { desc, eq } from 'drizzle-orm';

const query: Resolvers['Query'] = {
  media: async (_, args, context) => {
    if (!args.input) {
      throw new Error(
        'Oops! the schema lied and the input is supposed to be specified',
      );
    }

    const { id } = args.input;
    const [media] = await context
      .db
      .select()
      .from(schema.media)
      .where(eq(schema.media.uuid, id));

    return media;
  },

  getMediaForFeed: async (parent, args, context, info) => {
    const { maxUsers, maxFiles } = args.input || {};
    const users = await context
      .db
      .select()
      .from(schema.media)
      .orderBy(desc(schema.media.createdAt))
      .limit(maxUsers || 10);

    return [];
  },

  getUserMedia: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },

  getUserMediaPagination: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },

  areaMediaPagination: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },

  climbMediaPagination: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },

  getTagsLeaderboard: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },
};

export default query;
