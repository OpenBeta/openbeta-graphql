import { EntityId } from 'beta/entity_model';
import { ancestors } from 'beta/repo/entity_cte';
import { Context } from 'server/context';
import { UUIDTypes } from 'uuid';

export type HasCacheableLineage = {
  __cachedLineage: { id: number; uuid: UUIDTypes; name: string | null }[];
};

export const inFlight = new WeakMap<
  object,
  Promise<HasCacheableLineage['__cachedLineage']>
>();

export async function requireAncestry(
  parent: { id: EntityId } & Partial<HasCacheableLineage>,
  ctx: Context,
) {
  if (parent.__cachedLineage) {
    return parent.__cachedLineage;
  }

  let promise = inFlight.get(parent);

  if (!promise) {
    promise = ctx
      .db
      .execute(ancestors(ctx.db, parent.id))
      .then((d) => {
        const rows = d.rows as HasCacheableLineage['__cachedLineage'];
        parent.__cachedLineage = rows;
        inFlight.delete(parent);
        return rows;
      });
    inFlight.set(parent, promise);
  }

  return promise;
}
