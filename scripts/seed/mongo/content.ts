import * as schema from '@schema';
import { argv } from './args';
import { forEachRow, uuidToPsql } from './utils';

export async function processEntityContent(
  db: schema.Database,
  collection: string,
) {
  const count = await forEachRow<any>(collection, async (row) => {
    const entityUuid = collection === 'areas'
      ? (row.metadata?.area_id || row._id)
      : row._id;

    const parentId = uuidToPsql.get(entityUuid);
    if (!parentId || !row.content) return;

    for (const [key, text] of Object.entries(row.content)) {
      if (!text || typeof text !== 'string') continue;

      const [created] = await db
        .insert(schema.entity)
        .values(
          {
            entityType: 'content' as const,
            name: key,
            parent: parentId,
          },
        )
        .returning({ id: schema.entity.id });

      await db.insert(schema.content).values(
        {
          id: created.id,
          text,
        },
      );
    }
  });
}
