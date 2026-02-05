import * as schema from '@schema';
import ora from 'ora';
import { argv } from './args';
import { forEachRow, uuidToId } from './utils';

export async function seedUsers(db: schema.Database) {
  const spinner = ora('Seeding users...').start();
  let batch: any[] = [];
  const count = await forEachRow<any>('users', async (row) => {
    batch.push({
      uuid: row._id,
      username: row.usernameInfo?.username || `user_${row._id.substring(0, 8)}`,
      email: row.email,
      displayName: row.displayName,
      bio: row.bio,
      website: row.website,
      avatar: row.avatar,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });

    if (batch.length >= argv.batch) {
      const rows = await db
        .insert(schema.user)
        .values(batch)
        .onConflictDoNothing()
        .returning({ id: schema.user.id, uuid: schema.user.uuid });
      for (const r of rows) uuidToId.set(r.uuid, r.id);
      batch = [];
    }
  }, spinner);
  if (batch.length > 0) {
    const rows = await db
      .insert(schema.user)
      .values(batch)
      .onConflictDoNothing()
      .returning({ id: schema.user.id, uuid: schema.user.uuid });
    for (const r of rows) uuidToId.set(r.uuid, r.id);
  }

  // Fill uuidToId for existing users if any
  const existing = await db
    .select({
      id: schema.user.id,
      uuid: schema.user.uuid,
    })
    .from(schema.user);
  for (const r of existing) uuidToId.set(r.uuid, r.id);
  spinner.succeed(`Finished users. Total: ${count}`);
}
