import { Database } from '@schema';
import * as schema from '@schema';
import { GradeDisiplineMap, GradeSystemName } from '__tests__/faker';
import { Actor } from 'beta/actor';
import { EntityAddressable } from 'beta/entity_model';
import { InferSelectModel } from 'drizzle-orm';
import { UUIDTypes } from 'uuid';

export class TestActor
  implements Actor, Omit<InferSelectModel<typeof schema.user>, 'uuid'>
{
  uuid: UUIDTypes;
  id: number;
  username: string;
  displayName: string | null;
  bio: string | null;
  website: string | null;
  email: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(user: InferSelectModel<typeof schema.user>) {
    this.id = user.id;
    this.username = user.username;
    this.displayName = user.displayName;
    this.bio = user.bio;
    this.website = user.website;
    this.email = user.email;
    this.avatar = user.avatar;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;

    this.uuid = user.uuid;
  }
  async mayEdit(_: EntityAddressable) {
    return true;
  }
  async mayDelete(_: EntityAddressable) {
    return true;
  }
  async mayRestore(_: EntityAddressable) {
    return true;
  }
  async maySetLock(_: EntityAddressable) {
    return true;
  }
}

export async function initializeGradeSystemsInDatabase(db: Database) {
  for (const discipline of schema.enums.Discipline.enumValues) {
    // Each discipline needs 0 or more grade systems
    for (const gradeSystemName in Object.keys(GradeDisiplineMap[discipline])) {
      if (!(gradeSystemName in GradeDisiplineMap[discipline])) continue;

      const [system] = await db
        .insert(schema.gradeSystem)
        .values({
          name: gradeSystemName,
          discipline,
        })
        .returning();

      const grades =
        GradeDisiplineMap[discipline][gradeSystemName as GradeSystemName]
          ?.map((i) => ({
            ...i,
            system: system.id,
          }));

      if (grades === undefined) {
        throw new Error(
          'Uh Oh, our prior check for this grade init has gone awry',
        );
      }

      await db.insert(schema.grade).values(grades);
    }
  }
}
