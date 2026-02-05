import * as schema from '@schema';
import ora from 'ora';
import { argv } from './args';
import { forEachRow, uuidToId } from './utils';

export async function seedContent(db: schema.Database) {
  const spinner = ora('Seeding content from areas and climbs...').start();

  async function processEntityContent(collection: string) {
    let entityBatch: any[] = [];

    const count = await forEachRow<any>(collection, async (row) => {
      const entityUuid = collection === 'areas'
        ? (row.metadata?.area_id || row._id)
        : row._id;
      const parentId = uuidToId.get(entityUuid);
      if (!parentId || !row.content) return;

      for (const [key, text] of Object.entries(row.content)) {
        if (!text || typeof text !== 'string') continue;

        entityBatch.push({
          entityType: 'content' as const,
          name: key,
          parent: parentId,
          _text: text, // Temporary property for mapping
        });

        if (entityBatch.length >= argv.batch) {
          const rows = await db
            .insert(schema.entity)
            .values(entityBatch.map(({ _text, ...e }) => e))
            .returning({ id: schema.entity.id });
          const contentBatch = rows.map((r, i) => ({
            id: r.id,
            text: entityBatch[i]._text,
          }));
          await db.insert(schema.content).values(contentBatch);
          entityBatch = [];
        }
      }
    }, spinner);

    if (entityBatch.length > 0) {
      const rows = await db
        .insert(schema.entity)
        .values(entityBatch.map(({ _text, ...e }) => e))
        .returning({ id: schema.entity.id });
      const contentBatch = rows.map((r, i) => ({
        id: r.id,
        text: entityBatch[i]._text,
      }));
      await db.insert(schema.content).values(contentBatch);
    }
    return count;
  }

  spinner.text = 'Seeding content from areas...';
  await processEntityContent('areas');
  spinner.text = 'Seeding content from climbs...';
  await processEntityContent('climbs');
  spinner.succeed('Finished seeding content.');
}
