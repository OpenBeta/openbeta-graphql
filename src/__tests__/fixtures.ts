import { ApolloServer } from '@apollo/server';
import { Database } from '@schema';
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
      repo: { area: new AreaRepo(db, testActor) },
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
    await use(testContext.repo.area);
  },
});

export { expect } from 'vitest';
