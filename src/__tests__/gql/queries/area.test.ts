import { expect, test } from '../../fixtures';

test('Query: area', async ({ server, testContext, country }) => {
  const query = `
    ${AREA_FIELDS}
    query GetArea($uuid: ID!) {
      area(uuid: $uuid) {
        ...AreaFields
      }
    }
  `;

  const response = await server.executeOperation(
    { query, variables: { uuid: country.uuid } },
    { contextValue: testContext },
  );

  expect(response.body.kind).toBe('single');
  const result = response.body.kind === 'single'
    ? response.body.singleResult
    : null;
  expect(result?.errors).toBeUndefined();
  const data = result?.data as any;
  expect(data?.area).toBeDefined();
  expect(data?.area.uuid).toBe(country.uuid);
});

test('Query: areas', async ({ server, testContext, country }) => {
  const query = `
    ${AREA_FIELDS}
    query GetAreas {
      areas(limit: 10) {
        ...AreaFields
      }
    }
  `;

  const response = await server.executeOperation(
    { query },
    { contextValue: testContext },
  );

  expect(response.body.kind).toBe('single');
  const result = response.body.kind === 'single'
    ? response.body.singleResult
    : null;
  expect(result?.errors).toBeUndefined();
  const data = result?.data as any;
  expect(data?.areas).toBeDefined();
  expect(Array.isArray(data?.areas)).toBe(true);
});

test('Query: stats', async ({ server, testContext }) => {
  const query = `
    query GetStats {
      stats {
        totalClimbs
        totalCrags
      }
    }
  `;

  const response = await server.executeOperation(
    { query },
    { contextValue: testContext },
  );

  expect(response.body.kind).toBe('single');
  const result = response.body.kind === 'single'
    ? response.body.singleResult
    : null;
  expect(result?.errors).toBeUndefined();
  const data = result?.data as any;
  expect(data?.stats).toBeDefined();
});

test('Query: countries', async ({ server, testContext }) => {
  const query = `
    ${AREA_FIELDS}
    query GetCountries {
      countries {
        ...AreaFields
      }
    }
  `;

  const response = await server.executeOperation(
    { query },
    { contextValue: testContext },
  );

  expect(response.body.kind).toBe('single');
  const result = response.body.kind === 'single'
    ? response.body.singleResult
    : null;
  expect(result?.errors).toBeUndefined();
  const data = result?.data as any;
  expect(data?.countries).toBeDefined();
  expect(Array.isArray(data?.countries)).toBe(true);
});

const AREA_FIELDS = `
  fragment AreaFields on Area {
    id
    uuid
    area_name
    areaName
    shortCode
    metadata {
      isDestination
      leaf
      isBoulder
      lat
      lng
      bbox
      leftRightIndex
      mp_id
      area_id
      areaId
      polygon
    }
    ancestors
    pathTokens
    pathHash
    gradeContext
    density
    totalClimbs
    imageByteSum
    content {
      description
      areaLocation
    }
    aggregate {
      byGrade {
        count
        label
      }
      byDiscipline {
        trad { total bands { unknown beginner intermediate advanced expert } }
        sport { total bands { unknown beginner intermediate advanced expert } }
        bouldering { total bands { unknown beginner intermediate advanced expert } }
        deepwatersolo { total bands { unknown beginner intermediate advanced expert } }
        alpine { total bands { unknown beginner intermediate advanced expert } }
        snow { total bands { unknown beginner intermediate advanced expert } }
        ice { total bands { unknown beginner intermediate advanced expert } }
        mixed { total bands { unknown beginner intermediate advanced expert } }
        aid { total bands { unknown beginner intermediate advanced expert } }
        tr { total bands { unknown beginner intermediate advanced expert } }
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
      createdBy
      createdByUser
      updatedAt
      updatedBy
      updatedByUser
    }
  }
`;
