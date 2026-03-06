import { GraphQLResolveInfo } from 'graphql';
import { parseResolveInfo, ResolveTree } from 'graphql-parse-resolve-info';
import { Context } from 'server/context';
import { EntityId } from './entity_model';
import { HasCacheableLineage, inFlight } from './lineage';
import { bulkAncestors } from './repo/entity_cte';

/**
 * Checks if the current GraphQL selection includes fields that require ancestry data.
 */
export function shouldLoadAncestry(info: GraphQLResolveInfo): boolean {
  const selection = parseResolveInfo(info) as ResolveTree;
  if (!selection) return false;

  const fields = selection.fieldsByTypeName;
  for (const typeName in fields) {
    const typeFields = fields[typeName];
    if (
      'ancestors' in typeFields
      || 'pathTokens' in typeFields
      || 'pathHash' in typeFields
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Pre-loads ancestry for one or more entities in a single batch query if needed.
 */
export async function preloadAncestry<
  T extends { id: EntityId } & Partial<HasCacheableLineage>,
>(
  entities: T | T[],
  ctx: Context,
) {
  const items = Array.isArray(entities) ? entities : [entities];
  const toLoad = items.filter((item) =>
    !item.__cachedLineage && !inFlight.has(item)
  );

  if (toLoad.length === 0) return;

  const ids = toLoad.map((item) => item.id);

  const promise = ctx.db.execute(bulkAncestors(ctx.db, ids)).then((result) => {
    const rows = result
      .rows as (
        & { origin_id: number }
        & HasCacheableLineage['__cachedLineage'][
          number
        ]
      )[];
    const groups = new Map<number, HasCacheableLineage['__cachedLineage']>();

    for (const row of rows) {
      let group = groups.get(row.origin_id);
      if (!group) {
        group = [];
        groups.set(row.origin_id, group);
      }
      group.push({ id: row.id, uuid: row.uuid, name: row.name });
    }

    for (const item of toLoad) {
      item.__cachedLineage = groups.get(item.id) || [];
      inFlight.delete(item);
    }

    return groups;
  });

  for (const item of toLoad) {
    inFlight.set(item, promise.then((groups) => groups.get(item.id) || []));
  }

  await promise;
}
