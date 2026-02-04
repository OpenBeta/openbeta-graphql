import * as schema from '@schema';
import { and, eq, inArray } from 'drizzle-orm';
import { EntityId } from './entity_model';

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
