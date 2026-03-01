import * as schema from '@schema';
import { eq, InferInsertModel } from 'drizzle-orm';
import { argv } from './args';
import { forEachRow, uuidToPsql } from './utils';

export async function seedOrganizations(db: schema.Database) {
  let count = 0;
  await forEachRow<any>('organizations', async (row) => {
    const orgUuid = row.orgId;
    const [entity] = await db
      .insert(schema.entity)
      .values({
        uuid: orgUuid,
        entityType: 'organization' as const,
        name: row.displayName,
        created: row.createdAt,
      })
      .onConflictDoNothing()
      .returning({ id: schema.entity.id });

    let orgId = entity?.id;
    if (!orgId) {
      const [existing] = await db
        .select({ id: schema.entity.id })
        .from(schema.entity)
        .where(eq(schema.entity.uuid, orgUuid));
      orgId = existing?.id;
    }
    if (!orgId) return;
    uuidToPsql.set(orgUuid, orgId);

    await db
      .insert(schema.organization)
      .values({
        id: orgId,
        orgType: row.orgType,
        displayName: row.displayName,
        createdAt: row.createdAt,
      })
      .onConflictDoNothing();

    if (row.associatedAreaIds) {
      for (const areaUuid of row.associatedAreaIds) {
        const areaId = uuidToPsql.get(areaUuid);
        if (areaId) {
          await db
            .insert(schema.organizationArea)
            .values({
              organizationId: orgId,
              areaId: areaId,
              isExclusion: false,
            })
            .onConflictDoNothing();
        }
      }
    }
    if (row.excludedAreaIds) {
      for (const areaUuid of row.excludedAreaIds) {
        const areaId = uuidToPsql.get(areaUuid);
        if (areaId) {
          await db
            .insert(schema.organizationArea)
            .values({
              organizationId: orgId,
              areaId: areaId,
              isExclusion: true,
            })
            .onConflictDoNothing();
        }
      }
    }
    count++;
  });
}

export async function seedTicks(db: schema.Database) {
  const validStyles = schema.enums.TickStyle.enumValues;
  const validAttemptTypes = schema.enums.TickAttemptType.enumValues;
  let failedTicks = 0;

  await forEachRow<any>('ticks', async (row) => {
    const userId = uuidToPsql.get(row.userId);
    const climbId = uuidToPsql.get(row.climbId);

    if (userId === undefined) throw new Error('Missing userID for a tick');

    await db
      .insert(schema.tick)
      .values({
        userId: userId,
        name: row.name,
        climb: climbId,
        notes: row.notes,
        climbId: row.climbId,
        attemptType: validAttemptTypes.includes(row.attemptType)
          ? row.attemptType
          : undefined,
        dateClimbed: row.dateClimbed,
        source: row.source || 'OB',
        createdAt: row.createdAt || row.dateClimbed,
        updatedAt: row.updatedAt || row.dateClimbed,
        style: validStyles.includes(row.style) ? row.style : undefined,
      })
      .catch((e) => {
        failedTicks += 1;
        console.log(failedTicks, row._id, e);
      });
  });
}

export async function seedMedia(db: schema.Database) {
  await forEachRow<any>('media_objects', async (row) => {
    const userId = uuidToPsql.get(row.userUuid);
    if (!userId) return;

    const [inserted] = await db
      .insert(schema.media)
      .values({
        author: row.author,
        mediaUrl: row.mediaUrl,
        width: row.width,
        height: row.height,
        format: row.format,
        size: row.size,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      .returning({ id: schema.media.id });

    for (const tag of row._tags ?? []) {
      const targetId = uuidToPsql.get(tag.targetId);
      if (!targetId) {
        continue;
      }

      const kind = tag.type === 0
        ? 'climb'
        : tag.type === 1
        ? 'area'
        : null;
      if (kind) {
        await db
          .insert(schema.tag)
          .values(
            {
              mediaId: inserted.id,
              targetId: targetId,
              targetEntityKind: kind,
            },
          )
          .onConflictDoNothing();
      }
    }
  });
}
