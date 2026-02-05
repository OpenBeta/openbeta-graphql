import * as schema from '@schema';
import { eq, sql } from 'drizzle-orm';
import ora from 'ora';
import { argv } from './args';
import { forEachRow, uuidToId } from './utils';

export async function seedAreas(db: schema.Database) {
  await createAreaEntities(db);
  await loadAreaIdMap(db);
  await seedAreaDetailsAndParents(db);
}

async function createAreaEntities(db: schema.Database) {
  const spinner = ora('Seeding area entities (Pass 1)...').start();
  let batch: any[] = [];

  const count = await forEachRow<any>('areas', async (row) => {
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
  }, spinner);

  if (batch.length > 0) {
    await db.insert(schema.entity).values(batch).onConflictDoNothing();
  }
  spinner.succeed(`Finished area entities (Pass 1). Total: ${count}`);
}

async function loadAreaIdMap(db: schema.Database) {
  const spinner = ora('Loading area IDs into memory...').start();
  const entities = await db
    .select({
      id: schema.entity.id,
      uuid: schema.entity.uuid,
    })
    .from(schema.entity)
    .where(eq(schema.entity.entityType, 'area'));

  for (const e of entities) {
    uuidToId.set(e.uuid, e.id);
  }
  spinner.succeed(`Loaded ${entities.length} area IDs into memory.`);
}

async function seedAreaDetailsAndParents(db: schema.Database) {
  const spinner = ora('Seeding area details (Pass 2)...').start();
  let areaBatch: any[] = [];
  let parentUpdates: { id: number; parent: number }[] = [];

  const count = await forEachRow<any>('areas', async (mongoArea) => {
    const areaUuid = mongoArea.metadata?.area_id || mongoArea._id;
    const postgresId = uuidToId.get(areaUuid);
    if (!postgresId) {
      throw new Error(
        `${areaUuid} did not resolve to an entity we have inserted into postgres`,
      );
    }

    // Handle Parent Assignment
    const parentId = getParentId(mongoArea, areaUuid);
    if (parentId && parentId !== postgresId) {
      parentUpdates.push({ id: postgresId, parent: parentId });
    } else {
      if (mongoArea.pathTokens.length > 1) {
        console.error(mongoArea);
        throw new Error('Only countries should have no parents');
      }
    }

    areaBatch.push({
      id: postgresId,
      name: mongoArea.area_name,
      shortCode: mongoArea.shortCode,
      density: mongoArea.density || 0,
      totalClimbs: mongoArea.totalClimbs || 0,
      isDestination: mongoArea.metadata?.isDestination || false,
      location: mongoArea.metadata?.lnglat
        ? {
          x: mongoArea.metadata.lnglat.coordinates[0],
          y: mongoArea.metadata.lnglat.coordinates[1],
        }
        : null,
    });

    if (areaBatch.length >= argv.batch) {
      await db.insert(schema.area).values(areaBatch).onConflictDoNothing();
      areaBatch = [];
    }

    if (parentUpdates.length >= argv.batch) {
      await applyParentUpdates(db, parentUpdates);
      parentUpdates = [];
    }
  }, spinner);

  if (areaBatch.length > 0) {
    await db.insert(schema.area).values(areaBatch).onConflictDoNothing();
  }

  if (parentUpdates.length > 0) {
    await applyParentUpdates(db, parentUpdates);
  }
  spinner.succeed(`Finished area details (Pass 2). Total: ${count}`);
}

function getParentId(row: any, areaUuid: string): number | null {
  const ancestors = (row.ancestors?.split(',') || []).filter(
    (a: string) => a && a !== areaUuid,
  );
  const parentUuid = ancestors[ancestors.length - 1];
  return parentUuid ? uuidToId.get(parentUuid) || null : null;
}

async function applyParentUpdates(
  db: schema.Database,
  updates: { id: number; parent: number }[],
) {
  for (const update of updates) {
    await db.update(schema.entity).set({ parent: update.parent }).where(
      eq(schema.entity.id, update.id),
    );
  }
}
