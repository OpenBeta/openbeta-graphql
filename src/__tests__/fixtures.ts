import { ApolloServer } from '@apollo/server';
import { Database } from '@schema';
import { ClimbRepo } from 'beta/repo/climb';
import { test as base } from 'vitest';
import { Actor } from '../beta/actor';
import { AreaRepo } from '../beta/repo/area';
import typeDefs from '../gql';
import { resolvers } from '../resolvers';
import { Context, context } from '../server/context';
import { testDb } from './setup';

interface TestFixtures {
  db: Database;
  server: ApolloServer<Context>;
  testContext: Context;
  areaRepo: AreaRepo;
}

export const test = base.extend<TestFixtures>({
  db: async ({}, use) => {
    await use(testDb);
  },

  testContext: async ({ db }, use) => {
    const testActor: Actor | null = null; // No auth for now
    const testContext: Context = {
      db,
      actor: testActor,
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

  areaRepo: async ({ db, testContext }, use) => {
    await use(new AreaRepo(db));
  },
});

export { expect } from 'vitest';
