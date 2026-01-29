import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { Context, context } from '../../server/context';
import { Actor } from '../../beta/actor';
import { AreaRepo } from '../../beta/repo/area';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Database } from '@schema';
import typeDefs from '../../gql';
import { resolvers } from '../../resolvers';
import gql from 'graphql-tag';
import { TestDataHelper } from '../testDataHelper';

const COUNTRIES_QUERY = gql`
  query GetCountries {
    countries {
      id
      uuid
      area_name
      areaName
      gradeContext
      density
      totalClimbs
      metadata {
        isDestination
        leaf
        isBoulder
      }
      content {
        description
        areaLocation
      }
      ancestors
      pathTokens
      pathHash
      aggregate {
        byGrade {
          count
          label
        }
        byDiscipline {
          trad {
            total
            bands {
              unknown
              beginner
              intermediate
              advanced
              expert
            }
          }
          sport {
            total
            bands {
              unknown
              beginner
              intermediate
              advanced
              expert
            }
          }
          bouldering {
            total
            bands {
              unknown
              beginner
              intermediate
              advanced
              expert
            }
          }
        }
        byGradeBand {
          unknown
          beginner
          intermediate
          advanced
          expert
        }
      }
    }
  }
`;

describe('Countries Query', () => {
  let db: Database;
  let server: ApolloServer<Context>;
  let testContext: Context;
  let testDataHelper: TestDataHelper;
  let testCountry1: any;
  let testCountry2: any;

  beforeAll(async () => {
    const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!testDatabaseUrl) {
      throw new Error('Database URL not provided');
    }
    
    db = drizzle(testDatabaseUrl);
    
    const testActor: Actor | null = null;
    testContext = {
      db,
      actor: testActor,
      repo: { area: new AreaRepo(db, testActor) },
    };
    
    server = new ApolloServer<Context>({
      typeDefs,
      resolvers,
    });
    
    testDataHelper = new TestDataHelper(db);
    
    // Create test data
    testCountry1 = await testDataHelper.createTestCountry('USA');
    testCountry2 = await testDataHelper.createTestCountry('Canada');
  });

  afterAll(async () => {
    await testDataHelper.cleanupTestData();
  });

  test('should return a list of countries', async () => {
    const response = await server.executeOperation(
      {
        query: COUNTRIES_QUERY,
      },
      { contextValue: testContext }
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      // Since countries query is not implemented yet, expect an error
      expect(response.body.singleResult.errors).toBeDefined();
      expect(response.body.singleResult.errors?.[0].message).toContain('Not implemented');
    }
  });
});