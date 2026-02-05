import * as schema from '@schema';
import { eq } from 'drizzle-orm';
import ora from 'ora';
import { argv } from './args';
import { forEachRow, uuidToId } from './utils';

export async function seedOrganizations(db: schema.Database) {
  const spinner = ora('Seeding organizations...').start();
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
    uuidToId.set(orgUuid, orgId);

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
        const areaId = uuidToId.get(areaUuid);
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
        const areaId = uuidToId.get(areaUuid);
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
  }, spinner);
  spinner.succeed(`Finished organizations. Total: ${count}`);
}

export async function seedTicks(db: schema.Database) {
  const spinner = ora('Seeding ticks...').start();
  let batch: any[] = [];
  const validStyles = schema.enums.TickStyle.enumValues;
  const validAttemptTypes = schema.enums.TickAttemptType.enumValues;

  const count = await forEachRow<any>('ticks', async (row) => {
    const userId = uuidToId.get(row.userId);
    const climbId = uuidToId.get(row.climbId);

    batch.push({
      userId: userId,
      name: row.name,
      climbId: row.climbId,
      climb: climbId,
      style: validStyles.includes(row.style) ? row.style : 'Lead', // Default to Lead style
      notes: row.notes,
      attemptType: validAttemptTypes.includes(row.attemptType)
        ? row.attemptType
        : 'Attempt', // Default to Attempt
      dateClimbed: row.dateClimbed,
      source: row.source || 'OB',
      createdAt: row.createdAt || row.dateClimbed,
      updatedAt: row.updatedAt || row.dateClimbed,
    });

    if (batch.length >= argv.batch) {
      await db.insert(schema.tick).values(batch).onConflictDoNothing();
      batch = [];
    }
  }, spinner);
  if (batch.length > 0) {
    await db.insert(schema.tick).values(batch).onConflictDoNothing();
  }
  spinner.succeed(`Finished ticks. Total: ${count}`);
}

export async function seedMedia(db: schema.Database) {
  const spinner = ora('Seeding media...').start();
  let mediaBatch: any[] = [];
  let tagBatch: any[] = [];

  const count = await forEachRow<any>('media_objects', async (row) => {
    const userId = uuidToId.get(row.userUuid);
    if (!userId) return;

    mediaBatch.push({
      author: userId,
      mediaUrl: row.mediaUrl,
      width: row.width || 0,
      height: row.height || 0,
      format: row.format || 'unknown',
      size: row.size || 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _tags: row.entityTags || [],
    });

    if (mediaBatch.length >= argv.batch) {
      for (const m of mediaBatch) {
        const [inserted] = await db
          .insert(schema.media)
          .values({
            author: m.author,
            mediaUrl: m.mediaUrl,
            width: m.width,
            height: m.height,
            format: m.format,
            size: m.size,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          })
          .returning({ id: schema.media.id });

        for (const tag of m._tags) {
          const targetId = uuidToId.get(tag.entityUuid);
          if (targetId) {
            tagBatch.push({
              mediaId: inserted.id,
              targetId: targetId,
              targetEntityKind: tag.entityType.toLowerCase() as any,
            });
          }
        }
      }
      if (tagBatch.length > 0) {
        await db.insert(schema.tag).values(tagBatch).onConflictDoNothing();
        tagBatch = [];
      }
      mediaBatch = [];
    }
  }, spinner);

  if (mediaBatch.length > 0) {
    for (const m of mediaBatch) {
      const [inserted] = await db
        .insert(schema.media)
        .values({
          author: m.author,
          mediaUrl: m.mediaUrl,
          width: m.width,
          height: m.height,
          format: m.format,
          size: m.size,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })
        .returning({ id: schema.media.id });

      for (const tag of m._tags) {
        const targetId = uuidToId.get(tag.entityUuid);
        if (targetId) {
          tagBatch.push({
            mediaId: inserted.id,
            targetId: targetId,
            targetEntityKind: tag.entityType.toLowerCase() as any,
          });
        }
      }
    }
    if (tagBatch.length > 0) {
      await db.insert(schema.tag).values(tagBatch).onConflictDoNothing();
    }
  }
  spinner.succeed(`Finished media. Total: ${count}`);
}
