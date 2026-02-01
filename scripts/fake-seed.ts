import { faker } from '@faker-js/faker';
import { AreaContent } from '@gql';
import * as schema from '@schema';
import { EntityKind } from '@schema';
import {
  enumerateLinearPegMap,
  GradeDisiplineMap,
  GradeSystemName,
  gradeSystems,
  range,
} from '__tests__/faker';
import {
  initializeGradeSystemsInDatabase,
  TestActor,
} from '__tests__/faker/seed';
import { Actor, ActorError } from 'beta/actor';
import { EntityAddressable, EntityId } from 'beta/entity_model';
import { AreaPrimitive, AreaRepo } from 'beta/repo/area';
import { ClimbRepo } from 'beta/repo/climb';
import {
  continents,
  countries,
  ICountry,
  languages,
  TCountryCode,
} from 'countries-list';
import { disciplineEnum } from 'db/schema/gradeTable';
import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { UUIDTypes } from 'uuid';

const db = drizzle(process.env.DATABASE_URL!);

async function generateUsers(number: number) {
  return await db
    .insert(schema.user)
    .values(
      range(number).map(() => {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();

        return {
          username: faker.internet.username({ firstName, lastName }),
          displayname: faker.internet.displayName({ firstName, lastName }),
          email: faker.internet.email({
            firstName,
            lastName,
            provider: 'testing.openbeta.io',
          }),
        };
      }),
    )
    .returning()
    .then((d) => d.map((x) => new TestActor(x)));
}

const users: TestActor[] = await generateUsers(20);
const skipCountries = ['Antarctica', 'Israel'];

function choose<T>(from: T[]): T {
  return from[Math.floor(Math.random() * from.length)];
}

async function entityReify(entityType: schema.EntityKind, name?: string) {
  return await db
    .insert(schema.entity)
    .values({ entityType, name })
    .returning()
    .then((d) => d[0].id);
}

async function buildAreaTree(countryData: ICountry) {
  type AreaSelect = InferSelectModel<typeof schema.area>;
  const depth = Math.floor(Math.random() * 10);
  if (skipCountries.includes(countryData.name)) return;

  console.log(`seeding country ${countryData.name} depth ${depth}`);

  const [country] = await db
    .insert(schema.area)
    .values({
      name: countryData.name,
      id: await entityReify('area', countryData.name),
    })
    .returning();

  async function branch(from: AreaSelect, currentDepth: number) {
    for (const _ in range(Math.floor(Math.random() * 10))) {
      const repo = new AreaRepo(db, choose(users));

      repo
        .create({
          name: faker.food.adjective() + ' ' + faker.food.ingredient(),
          parent: from.id,
        })
        .then((child) => {
          // to create depths of various depths, we include some randomness
          // here in terms of early-exit
          if (Math.random() > 0.7) return;
          // always stop if we exceed the max depth
          if (currentDepth >= depth) {
            addClimbs(child.id).catch(console.error);
          }

          branch(child, currentDepth + 1).catch(console.error);
        })
        .catch(console.error);
    }
  }

  await branch(country, 0);
}

async function addClimbs(area: EntityId) {
  for (const _ in range(Math.random() * 10)) {
    let repo = new ClimbRepo(db, choose(users));
    let climbType = choose(schema.enums.Discipline.enumValues);

    repo
      .create({
        parent: area,
        name: faker.animal.petName(),
        fa: faker.person.fullName(),
        length: ['trad', 'aid', 'sport', 'top_rope'].includes(climbType)
          ? faker.number.int({ min: 10, max: 100 })
          : 0,
        boltsCount: climbType == 'sport'
          ? faker.number.int({ min: 0, max: 24 })
          : null,
        type: climbType,
        safety: null,
        canonicalGrade: null,
      })
      .catch(console.error);
  }
}

async function main() {
  await initializeGradeSystemsInDatabase(db);

  for (const countryCode in countries) {
    const country = countries[countryCode as TCountryCode];
    await buildAreaTree(country);
  }
}

await main().finally(process.exit);
