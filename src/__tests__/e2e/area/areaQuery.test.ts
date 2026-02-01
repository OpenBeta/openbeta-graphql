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

const AREA_QUERY = gql`
  query GetArea($uuid: ID!) {
    area(uuid: $uuid) {
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
        mp_id
        area_id
        areaId
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
      authorMetadata {
        createdAt
        updatedAt
      }
    }
  }
`;

describe('Area Query by UUID', () => {
  let db: Database;
  let server: ApolloServer<Context>;
  let testContext: Context;
  let testDataHelper: TestDataHelper;
  let testCountry: any;
  let testCrag: any;

  beforeAll(async () => {
    // Setup database connection
    const testDatabaseUrl = process.env.TEST_DATABASE_URL
      || process.env.DATABASE_URL;
    if (!testDatabaseUrl) {
      throw new Error('Database URL not provided');
    }

    db = drizzle(testDatabaseUrl);

    // Setup test context
    const testActor: Actor | null = null;
    testContext = {
      db,
      actor: testActor,
      repo: { area: new AreaRepo(db, testActor) },
    };

    // Setup Apollo Server
    server = new ApolloServer<Context>({
      typeDefs,
      resolvers,
    });

    // Setup test data
    testDataHelper = new TestDataHelper(db);
    testCountry = await testDataHelper.createTestCountry('Test Country');
    testCrag = await testDataHelper.createTestCrag('Test Crag', testCountry.id);
  });

  afterAll(async () => {
    await testDataHelper.cleanupTestData();
  });

  test('should return area by UUID with all fields', async () => {
    const response = await server.executeOperation(
      {
        query: AREA_QUERY,
        variables: { uuid: testCrag.uuid },
      },
      { contextValue: testContext },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data?.area).toBeDefined();

      const area = response.body.singleResult.data?.area as any;
      expect(area.uuid).toBe(testCrag.uuid);
      expect(area.area_name).toBe(testCrag.area_name);
      expect(area.areaName).toBe(testCrag.area_name);
      expect(area.gradeContext).toBe(testCrag.gradeContext);
      expect(area.density).toBe(testCrag.density);
      expect(area.totalClimbs).toBe(testCrag.totalClimbs);
      expect(area.metadata.leaf).toBe(testCrag.isLeaf);
    }
  });

  test('should return null for non-existent UUID', async () => {
    const response = await server.executeOperation(
      {
        query: AREA_QUERY,
        variables: { uuid: '00000000-0000-0000-0000-000000000000' },
      },
      { contextValue: testContext },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data?.area).toBeNull();
    }
  });

  test('should handle invalid UUID format gracefully', async () => {
    const response = await server.executeOperation(
      {
        query: AREA_QUERY,
        variables: { uuid: 'invalid-uuid' },
      },
      { contextValue: testContext },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      // May or may not have errors depending on validation implementation
      expect(response.body.singleResult.data?.area).toBeDefined();
    }
  });

  test('should return area with correct metadata structure', async () => {
    const response = await server.executeOperation(
      {
        query: AREA_QUERY,
        variables: { uuid: testCrag.uuid },
      },
      { contextValue: testContext },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      const area = response.body.singleResult.data?.area as any;
      expect(area.metadata).toBeDefined();
      expect(typeof area.metadata.isDestination).toBe('boolean');
      expect(typeof area.metadata.leaf).toBe('boolean');
      expect(area.metadata.mp_id).toBeDefined();
      expect(area.metadata.area_id).toBeDefined();
      expect(area.metadata.areaId).toBeDefined();
    }
  });

  test('should return area with aggregate data', async () => {
    const response = await server.executeOperation(
      {
        query: AREA_QUERY,
        variables: { uuid: testCrag.uuid },
      },
      { contextValue: testContext },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      const area = response.body.singleResult.data?.area as any;
      expect(area.aggregate).toBeDefined();
      expect(Array.isArray(area.aggregate.byGrade)).toBe(true);
      expect(area.aggregate.byDiscipline).toBeDefined();
      expect(area.aggregate.byGradeBand).toBeDefined();
    }
  });
});
