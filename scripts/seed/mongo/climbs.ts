import * as schema from '@schema';
import { eq } from 'drizzle-orm';
import ora from 'ora';
import { argv } from './args';
import { forEachRow, uuidToId } from './utils';

export async function seedClimbs(db: schema.Database) {
  const spinner1 = ora('Seeding climb entities (Pass 1)...').start();
  let entityBatch: any[] = [];
  let climbBatch: any[] = [];

  // Climbs also need entities first
  const count1 = await forEachRow<any>('climbs', async (row) => {
    const areaUuid = row.metadata?.areaRef;
    const areaId = areaUuid ? uuidToId.get(areaUuid) : null;

    const climbUuid = row._id;
    entityBatch.push({
      uuid: climbUuid,
      entityType: 'climb',
      name: row.name,
      parent: areaId,
      created: row.createdAt || new Date(),
    });

    if (entityBatch.length >= argv.batch) {
      const rows = await db
        .insert(schema.entity)
        .values(entityBatch)
        .onConflictDoNothing()
        .returning({ id: schema.entity.id, uuid: schema.entity.uuid });
      for (const r of rows) uuidToId.set(r.uuid, r.id);
      entityBatch = [];
    }
  }, spinner1);
  if (entityBatch.length > 0) {
    const rows = await db
      .insert(schema.entity)
      .values(entityBatch)
      .onConflictDoNothing()
      .returning({ id: schema.entity.id, uuid: schema.entity.uuid });
    for (const r of rows) uuidToId.set(r.uuid, r.id);
  }
  spinner1.succeed(`Finished climb entities (Pass 1). Total: ${count1}`);

  // Load remaining climb IDs if any
  const spinnerMap = ora('Loading climb IDs into memory...').start();
  const climbEntities = await db
    .select({
      id: schema.entity.id,
      uuid: schema.entity.uuid,
    })
    .from(schema.entity)
    .where(eq(schema.entity.entityType, 'climb'));
  for (const e of climbEntities) uuidToId.set(e.uuid, e.id);
  spinnerMap.succeed(`Loaded ${climbEntities.length} climb IDs into memory.`);

  const spinner2 = ora('Seeding climb details (Pass 2)...').start();
  const count2 = await forEachRow<any>('climbs', async (row) => {
    const postgresId = uuidToId.get(row._id);
    if (!postgresId) return;

    // Map Mongo type to Discipline enum
    let type: any = 'sport'; // Default
    if (row.type?.trad) type = 'trad';
    else if (row.type?.bouldering) type = 'bouldering';
    else if (row.type?.alpine) type = 'trad';
    else if (row.type?.ice) type = 'ice';
    else if (row.type?.mixed) type = 'ice';
    else if (row.type?.aid) type = 'aid';
    else if (row.type?.tr) type = 'top_rope';
    else if (row.type?.dws) type = 'dws';

    climbBatch.push({
      id: postgresId,
      name: row.name,
      type: type,
      fa: row.fa,
      length: row.length || 0,
      boltsCount: row.boltsCount || null,
      safety: row.safety === 'UNSPECIFIED'
        ? 'UNSPECIFIED'
        : (row.safety || 'UNSPECIFIED'),
      location: row.metadata?.lnglat
        ? {
          x: row.metadata.lnglat.coordinates[0],
          y: row.metadata.lnglat.coordinates[1],
        }
        : null,
    });

    if (climbBatch.length >= argv.batch) {
      await db.insert(schema.climb).values(climbBatch).onConflictDoNothing();
      climbBatch = [];
    }
  }, spinner2);
  if (climbBatch.length > 0) {
    await db.insert(schema.climb).values(climbBatch).onConflictDoNothing();
  }
  spinner2.succeed(`Finished climb details (Pass 2). Total: ${count2}`);
}
