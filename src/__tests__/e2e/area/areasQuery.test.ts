import { ApolloServer } from '@apollo/server';
import { Database } from '@schema';
import { Actor } from 'beta/actor';
import { AreaRepo } from 'beta/repo/area';
import { drizzle } from 'drizzle-orm/node-postgres';
import typeDefs from 'gql';
import gql from 'graphql-tag';
import { resolvers } from 'resolvers';
import { Context, context } from 'server/context';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { TestDataHelper } from '../../testDataHelper';

const AREAS_QUERY = gql`
  query GetAreas(
    $filter: Filter
    $sort: Sort
    $limit: Int
    $offset: Int
  ) {
    areas(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
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

describe('Areas Query with Filters and Sorting', () => {
  let db: Database;
  let server: ApolloServer<Context>;
  let testContext: Context;
  let testDataHelper: TestDataHelper;
  let testCountry1: any;
  let testCountry2: any;
  let testCrag1: any;
  let testCrag2: any;
  let testCrag3: any;

  beforeAll(async () => {
    const testDatabaseUrl = process.env.TEST_DATABASE_URL
      || process.env.DATABASE_URL;
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

    testCrag1 = await testDataHelper.createTestCrag(
      'Yosemite',
      testCountry1.id,
    );
    testCrag2 = await testDataHelper.createTestCrag(
      'Red Rocks',
      testCountry1.id,
    );
    testCrag3 = await testDataHelper.createTestCrag(
      'Squamish',
      testCountry2.id,
    );
  });

  afterAll(async () => {
    await testDataHelper.cleanupTestData();
  });

  test('should return areas list', async () => {
    const response = await server.executeOperation(
      {
        query: AREAS_QUERY,
      },
      { contextValue: testContext },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      // Since areas query is not implemented yet, expect an error
      expect(response.body.singleResult.errors).toBeDefined();
      expect(response.body.singleResult.errors?.[0].message).toContain(
        'Not implemented',
      );
    }
  });

  test('should handle filter parameters when implemented', async () => {
    const response = await server.executeOperation(
      {
        query: AREAS_QUERY,
        variables: {
          filter: {
            area_name: {
              match: 'Yosemite',
              exactMatch: false,
            },
          },
        },
      },
      { contextValue: testContext },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeDefined();
      expect(response.body.singleResult.errors?.[0].message).toContain(
        'Not implemented',
      );
    }
  });

  test('should handle sort parameters when implemented', async () => {
    const response = await server.executeOperation(
      {
        query: AREAS_QUERY,
        variables: {
          sort: {
            area_name: 1,
          },
        },
      },
      { contextValue: testContext },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeDefined();
      expect(response.body.singleResult.errors?.[0].message).toContain(
        'Not implemented',
      );
    }
  });

  test('should handle pagination parameters when implemented', async () => {
    const response = await server.executeOperation(
      {
        query: AREAS_QUERY,
        variables: {
          limit: 10,
          offset: 0,
        },
      },
      { contextValue: testContext },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeDefined();
      expect(response.body.singleResult.errors?.[0].message).toContain(
        'Not implemented',
      );
    }
  });

  test('should handle combined filter, sort, and pagination when implemented', async () => {
    const response = await server.executeOperation(
      {
        query: AREAS_QUERY,
        variables: {
          filter: {
            area_name: {
              match: 'Test',
              exactMatch: false,
            },
          },
          sort: {
            totalClimbs: -1,
          },
          limit: 5,
          offset: 0,
        },
      },
      { contextValue: testContext },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeDefined();
      expect(response.body.singleResult.errors?.[0].message).toContain(
        'Not implemented',
      );
    }
  });
});
