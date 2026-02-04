import * as schema from '@schema';
import { and, eq, inArray } from 'drizzle-orm';
import { GraphQLResolveInfo } from 'graphql';
import { parseResolveInfo } from 'graphql-parse-resolve-info';
import { Context } from 'server/context';
import { EntityId, EntityIdentifiable } from './entity_model';

export async function contentByTag(
  db: schema.Database,
  entity: EntityId,
  tags: string[],
) {
  const simpleContentMap: Record<string, string> = {};

  await db
    .select({
      name: schema.entity.name,
      text: schema.content.text,
    })
    .from(schema.content)
    .innerJoin(schema.entity, eq(schema.entity.id, schema.content.id))
    .where(
      and(
        eq(schema.entity.parent, entity),
        inArray(schema.entity.name, tags),
      ),
    )
    .then((rows) =>
      rows.forEach((row) => {
        if (row.name === null) return;
        simpleContentMap[row.name] = row.text;
      })
    );

  return simpleContentMap;
}

export function resolveContent<T extends EntityIdentifiable>(field: string) {
  async function resolver(
    parent: T,
    _: unknown,
    context: Context,
    info: GraphQLResolveInfo,
  ) {
    const selection = parseResolveInfo(info);
    // The user may have requested multiple content types
    // and we'll selectively resolve them.
    const requestedFields = selection?.fieldsByTypeName[field];
    if (!requestedFields) return {};

    return await contentByTag(
      context.db,
      parent.id,
      Object.keys(requestedFields),
    );
  }

  return resolver;
}
