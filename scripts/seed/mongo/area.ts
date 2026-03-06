import * as schema from '@schema';
import { countries, getCountryCode, TCountries } from 'countries-list';
import { eq } from 'drizzle-orm';
import { forEachRow, uuidToPsql } from './utils';

const countryNames = [
  Object.values(countries).map((i) => i.name),
  // Polyfill
  'USA',
  'Afghanistan',
  'American Samoa',
];

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

export async function seedAreaParents(db: schema.Database) {
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

    if (parentId === null) {
      return;
    }

    await db
      .update(schema.entity)
      .set({ parent: parentId })
      .where(
        eq(schema.entity.id, postgresId),
      );
  });
}

export async function seedAreaDetails(
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

    await db
      .insert(schema.area)
      .values(
        {
          id: postgresId,
          name: mongoArea.area_name,
          shortCode: mongoArea.shortCode,
          density: mongoArea.density || 0,
          totalClimbs: mongoArea.totalClimbs || 0,
          isDestination: mongoArea.metadata?.isDestination,
          isBoulder: mongoArea.metadata?.isBoulder,
          location: mongoArea.metadata?.lnglat
            ? {
              x: mongoArea.metadata.lnglat.coordinates[0],
              y: mongoArea.metadata.lnglat.coordinates[1],
            }
            : null,
        },
      )
      .onConflictDoNothing();
  });
}

function getParentId(row: any, areaUuid: string): number | null {
  const ancestors = row.ancestors?.split(',') || [areaUuid];
  if (ancestors.length == 0) return null;
  const parentUuid = ancestors[ancestors.length - 2];
  return uuidToPsql.get(parentUuid) || null;
}
