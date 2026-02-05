import { Resolvers } from '@gql';
import * as schema from '@schema';
import { InferSelectModel } from 'drizzle-orm';

export type UserRecord = InferSelectModel<typeof schema.user>;

export const userResolvers: Resolvers['UserPublicProfile'] = {
  userUuid: async (parent) => parent.uuid,
};
