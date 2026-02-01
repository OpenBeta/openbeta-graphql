import { faker } from '@faker-js/faker';
import { AreaContent } from '@gql';
import * as schema from '@schema';
import { EntityKind } from '@schema';
import { Actor, ActorError } from 'beta/actor';
import { EntityAddressable, EntityId } from 'beta/entity_model';
import { AreaPrimitive, AreaRepo } from 'beta/repo/area';
import {
  continents,
  countries,
  ICountry,
  languages,
  TCountryCode,
} from 'countries-list';
import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { UUIDTypes } from 'uuid';

const db = drizzle(process.env.DATABASE_URL!);

function range(len: number): number[] {
  return Array(Math.floor(len)).fill(0).map((_, idx) => idx);
}

class TestActor
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
      gradeContext: 'VSCALE',
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
          gradeContext: country.gradeContext,
        })
        .then((child) => {
          // to create depths of various depths, we include some randomness
          // here in terms of early-exit
          if (Math.random() > 0.7) return;
          // always stop if we exceed the max depth
          if (currentDepth >= depth) return;

          branch(child, currentDepth + 1).catch(console.error);
        })
        .catch(console.error);
    }
  }

  await branch(country, 0);
}

async function addClimbs(climb: EntityId) {
  for (const _ in range(Math.random() * 10)) {
    // TODO: Add climb repo
  }
}

async function main() {
  for (const countryCode in countries) {
    const country = countries[countryCode as TCountryCode];
    await buildAreaTree(country);
  }
}

await main().finally(process.exit);
