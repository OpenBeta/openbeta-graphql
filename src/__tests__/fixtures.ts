import { ApolloServer } from '@apollo/server';
import { faker } from '@faker-js/faker';
import { Database } from '@schema';
import * as schema from '@schema';
import { ClimbRepo } from 'beta/repo/climb';
import { test as base } from 'vitest';
import { Actor } from '../beta/actor';
import { AreaPrimitive, AreaRepo } from '../beta/repo/area';
import typeDefs from '../gql';
import { resolvers } from '../resolvers';
import { Context } from '../server/context';
import { testDb } from './setup';
import { TestActor } from './testActor';

interface TestFixtures {
  db: Database;
  server: ApolloServer<Context>;
  testContext: Context;
  areaRepo: AreaRepo;
  climbRepo: ClimbRepo;
  country: AreaPrimitive;
  actor: Actor;
}

export const test = base.extend<TestFixtures>({
  db: async ({}, use) => {
    await use(testDb);
  },

  actor: async ({ db }, use) => {
    const [testUser] = await db
      .insert(schema.user)
      .values({
        username: faker.internet.username(),
        displayName: faker.internet.displayName(),
        email: faker.internet.email(),
      })
      .returning();
    
    await use(new TestActor(testUser));
  },

  testContext: async ({ db, actor }, use) => {
    const testContext: Context = {
      db,
      actor,
      repo: {
        area: new AreaRepo(db),
        climb: new ClimbRepo(db),
      },
    };
    await use(testContext);
  },

  server: async ({}, use) => {
    const server = new ApolloServer<Context>({
      typeDefs,
      resolvers,
    });
    await use(server);
  },

  areaRepo: async ({ db }, use) => {
    await use(new AreaRepo(db));
  },

  climbRepo: async ({ db }, use) => {
    await use(new ClimbRepo(db));
  },

  country: async ({ db }, use) => {
    const countryName = faker.location.country();
    const [entityRow] = await db
      .insert(schema.entity)
      .values({ 
        entityType: 'area', 
        name: countryName 
      })
      .returning();

    const [areaRow] = await db
      .insert(schema.area)
      .values({ 
        id: entityRow.id, 
        name: countryName
      })
      .returning();

    const fullCountry = { 
      ...entityRow, 
      ...areaRow 
    } as AreaPrimitive;

    await use(fullCountry);
  },
});

export { expect } from 'vitest';
