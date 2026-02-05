import { Resolvers } from '@gql';
import * as schema from '@schema';
import { eq, InferSelectModel } from 'drizzle-orm';

type UserCachable = {
  __user: InferSelectModel<typeof schema.user>;
};

export type TickRecord =
  & InferSelectModel<typeof schema.tick>
  & Partial<UserCachable>;

async function requireUserIsCached(
  db: schema.Database,
  user: number,
  node: Partial<UserCachable>,
) {
  if (node.__user === undefined) {
    node.__user = await db
      .select()
      .from(schema.user)
      .where(
        eq(schema.user.id, user),
      )
      .then(([u]) => u);
  }

  if (node.__user === undefined) {
    throw new Error('The user could not be cached into its parent');
  }

  return node.__user;
}

export const tickResolvers: Resolvers['TickType'] = {
  _id: async (parent) => parent.id.toString(),
  userId: async (parent, _, ctx) =>
    requireUserIsCached(ctx.db, parent.userId, parent).then((usr) => usr.uuid),
  grade: async (parent) => String(parent.grade || parent.freeformGrade),
  user: async (parent, _, ctx) =>
    requireUserIsCached(ctx.db, parent.userId, parent),
  climb: async (parent, _, ctx) => ctx.repo.climb.get(parent),
};
