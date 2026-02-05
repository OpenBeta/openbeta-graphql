import { Resolvers } from '@gql';
import * as schema from '@schema';
import { eq } from 'drizzle-orm';
import { context } from 'server/context';

export const mediaResolvers: Resolvers['MediaWithTags'] = {
  uploadTime: async (parent) => parent.createdAt,
  entityTags: async (parent, _, context) =>
    context
      .db
      .select()
      .from(schema.tag)
      .where(
        eq(schema.tag.mediaId, parent.id),
      ),
  user: async () => {
    throw new Error('Not implemented');
  },
};
