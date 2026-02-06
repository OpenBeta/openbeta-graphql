import { Resolvers } from '@gql';
import * as schema from '@schema';
import { mediaConnection } from 'beta/repo/media';
import { desc, eq, getTableColumns } from 'drizzle-orm';

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

    return await context
      .db
      .select()
      .from(schema.media)
      .innerJoin(schema.user, eq(schema.user.id, schema.media.author))
      .orderBy(desc(schema.media.createdAt))
      .limit(maxFiles || 100)
      .then((rows) =>
        rows.map((item) => ({
          userUuid: item.user.uuid,
          username: item.user.username,
          mediaWithTags: [item.media],
        }))
      );
  },

  getUserMedia: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },

  getUserMediaPagination: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },

  areaMediaPagination: async (parent, args, context, info) => {
    if (!args.input?.areaUuid) {
      throw new Error('areaUuid is required');
    }
    const area = await context.repo.area.get(args.input.areaUuid);
    const connection = await mediaConnection(context.db, area, {
      first: args.input.first,
      after: args.input.after,
    });
    return {
      areaUuid: area.uuid,
      mediaConnection: connection,
    };
  },

  climbMediaPagination: async (parent, args, context, info) => {
    if (!args.input?.climbUuid) {
      throw new Error('climbUuid is required');
    }
    const climb = await context.repo.climb.get(args.input.climbUuid);
    const connection = await mediaConnection(context.db, climb, {
      first: args.input.first,
      after: args.input.after,
    });
    return {
      climbUuid: climb.uuid,
      mediaConnection: connection,
    };
  },

  getTagsLeaderboard: async (parent, args, context, info) => {
    throw new Error('Not implemented');
  },
};

export default query;
