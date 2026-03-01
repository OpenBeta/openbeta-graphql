import * as schema from '@schema';
import { Spinner } from '@topcli/spinner';
import { argv } from './args';
import { forEachRow, uuidToPsql } from './utils';

export async function seedUsers(db: schema.Database) {
  const count = await forEachRow<any>('users', async (row) => {
    const [user] = await db
      .insert(schema.user)
      .values({
        uuid: row._id,
        username: row.usernameInfo?.username,
        email: row.email,
        displayName: row.displayName,
        bio: row.bio,
        website: row.website,
        avatar: row.avatar,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      .returning();

    uuidToPsql.set(user.uuid, user.id);
  });
}
