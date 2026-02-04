import { Database } from '@schema';
import * as schema from '@schema';
import { GradeDisiplineMap, GradeSystemName } from '__tests__/faker';
import { Actor } from 'beta/actor';
import { EntityAddressable } from 'beta/entity_model';
import { InferSelectModel } from 'drizzle-orm';
import { UUIDTypes } from 'uuid';

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
