import * as schema from '@schema';
import { eq, sql } from 'drizzle-orm';
import ora from 'ora';
import { argv } from './args';
import { forEachRow, uuidToId } from './utils';

export async function seedAreas(db: schema.Database) {
  // Pass 1: Create Entities
  const spinner1 = ora('Seeding area entities (Pass 1)...').start();
  let batch: any[] = [];
  const count1 = await forEachRow<any>('areas', async (row) => {
    const areaUuid = row.metadata?.area_id || row._id;
    batch.push({
      uuid: areaUuid,
      entityType: 'area',
      name: row.area_name,
      created: row.createdAt || new Date(),
    });

    if (batch.length >= argv.batch) {
      await db.insert(schema.entity).values(batch).onConflictDoNothing();
      batch = [];
    }
  }, spinner1);
  if (batch.length > 0) {
    await db.insert(schema.entity).values(batch).onConflictDoNothing();
  }
  spinner1.succeed(`Finished area entities (Pass 1). Total: ${count1}`);

  // Load all area IDs into map
  const spinnerMap = ora('Loading area IDs into memory...').start();
  const entities = await db
    .select({
      id: schema.entity.id,
      uuid: schema.entity.uuid,
    })
    .from(schema.entity)
    .where(eq(schema.entity.entityType, 'area'));
  for (const e of entities) uuidToId.set(e.uuid, e.id);
  spinnerMap.succeed(`Loaded ${entities.length} area IDs into memory.`);

  // Pass 2: Details and Parents
  const spinner2 = ora('Seeding area details (Pass 2)...').start();
  let areaBatch: any[] = [];
  let parentUpdates: { id: number; parent: number }[] = [];

  const count2 = await forEachRow<any>('areas', async (row) => {
    const areaUuid = row.metadata?.area_id || row._id;
    const postgresId = uuidToId.get(areaUuid);
    if (!postgresId) return;

    const ancestors = (row.ancestors?.split(',') || []).filter((a: string) =>
      a !== areaUuid
    );
    const parentUuid = ancestors[ancestors.length - 1];
    const parentId = parentUuid ? uuidToId.get(parentUuid) : null;

    if (parentId && parentId !== postgresId) {
      parentUpdates.push({ id: postgresId, parent: parentId });
    }

    areaBatch.push({
      id: postgresId,
      name: row.area_name,
      shortCode: row.shortCode,
      density: row.density || 0,
      totalClimbs: row.totalClimbs || 0,
      isDestination: row.metadata?.isDestination || false,
      location: row.metadata?.lnglat
        ? {
          x: row.metadata.lnglat.coordinates[0],
          y: row.metadata.lnglat.coordinates[1],
        }
        : null,
    });

    if (areaBatch.length >= argv.batch) {
      await db.insert(schema.area).values(areaBatch).onConflictDoNothing();
      areaBatch = [];
    }

    if (parentUpdates.length >= argv.batch) {
      const values = parentUpdates.map((u) =>
        sql`(${u.id}::integer, ${u.parent}::integer)`
      );
      await db.execute(sql`
        UPDATE ${schema.entity} AS e SET
          parent = v.parent_id
        FROM (VALUES ${sql.join(values, sql`, `)}) AS v(id, parent_id)
        WHERE e.id = v.id
      `);
      parentUpdates = [];
    }
  }, spinner2);

  if (areaBatch.length > 0) {
    await db.insert(schema.area).values(areaBatch).onConflictDoNothing();
  }

  if (parentUpdates.length > 0) {
    const values = parentUpdates.map((u) =>
      sql`(${u.id}::integer, ${u.parent}::integer)`
    );
    await db.execute(sql`
      UPDATE ${schema.entity} AS e SET
        parent = v.parent_id
      FROM (VALUES ${sql.join(values, sql`, `)}) AS v(id, parent_id)
      WHERE e.id = v.id
    `);
  }
  spinner2.succeed(`Finished area details (Pass 2). Total: ${count2}`);
}
