import { EntityId } from 'beta/entity_model';
import { ancestors } from 'beta/repo/entity_cte';
import { Context } from 'server/context';
import { UUIDTypes } from 'uuid';

export type HasCacheableLineage = {
  __cachedLineage: { id: number; uuid: UUIDTypes; name: string | null }[];
};

export async function requireAncestry(
  parent: { id: EntityId } & Partial<HasCacheableLineage>,
  ctx: Context,
) {
  if (parent.__cachedLineage == undefined) {
    parent.__cachedLineage = await ctx
      .db
      .execute(ancestors(ctx.db, parent.id))
      .then((d) => d.rows as HasCacheableLineage['__cachedLineage']);
  }

  return parent.__cachedLineage!;
}
