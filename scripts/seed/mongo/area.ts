import * as schema from '@schema';
import { eq } from 'drizzle-orm';
import { forEachRow, uuidToPsql } from './utils';

export async function createAreaEntities(db: schema.Database) {
  await forEachRow<any>('areas', async (row) => {
    const areaUuid = row.metadata?.area_id || row._id;

    const [ent] = await db
      .insert(schema.entity)
      .values(
        {
          uuid: areaUuid,
          entityType: 'area',
          name: row.area_name,
          created: row.createdAt || new Date(),
        },
      )
      .onConflictDoNothing()
      .returning();

    uuidToPsql.set(areaUuid, ent.id);
  });
}

export async function seedAreaDetailsAndParents(
  db: schema.Database,
) {
  await forEachRow<any>('areas', async (mongoArea) => {
    const areaUuid = mongoArea.metadata?.area_id || mongoArea._id;
    const postgresId = uuidToPsql.get(areaUuid);
    if (!postgresId) {
      throw new Error(
        `${areaUuid} did not resolve to an entity we have inserted into postgres`,
      );
    }

    // Handle Parent Assignment
    const parentId = getParentId(mongoArea, areaUuid);

    await db
      .insert(schema.area)
      .values(
        {
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
        },
      )
      .onConflictDoNothing();

    if (postgresId != parentId && parentId != null) {
      await db
        .update(schema.entity)
        .set({ parent: parentId })
        .where(
          eq(schema.entity.id, postgresId),
        );
    }
  });
}

function getParentId(row: any, areaUuid: string): number | null {
  const ancestors = (row.ancestors?.split(',') || []).filter(
    (a: string) => a && a !== areaUuid,
  );
  if (ancestors.length == 1) return null;
  const parentUuid = ancestors[ancestors.length - 1];
  return uuidToPsql.get(parentUuid) || null;
}
