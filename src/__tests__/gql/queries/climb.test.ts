import { expect, test } from '../../fixtures';

test('Query: climb', async ({ server, testContext, db, country, actor, climbRepo }) => {
  const climb = await climbRepo.create(actor, {
    name: 'Test Climb',
    parent: country.id,
    type: 'sport',
    length: 20,
    boltsCount: 10,
    fa: 'Test FA',
    location: { x: 0, y: 0 },
    safety: null,
    canonicalGrade: null,
  });

  const query = `
    ${CLIMB_FIELDS}
    query GetClimb($uuid: ID!) {
      climb(uuid: $uuid) {
        ...ClimbFields
        parent {
          id
          uuid
          areaName
        }
      }
    }
  `;

  const response = await server.executeOperation(
    { query, variables: { uuid: climb.uuid } },
    { contextValue: testContext },
  );

  expect(response.body.kind).toBe('single');
  const result = response.body.kind === 'single'
    ? response.body.singleResult
    : null;
  expect(result?.errors).toBeUndefined();
  const data = result?.data as any;
  expect(data?.climb).toBeDefined();
  expect(data?.climb.uuid).toBe(climb.uuid);
});

const CLIMB_FIELDS = `
  fragment ClimbFields on Climb {
    id
    uuid
    name
    fa
    length
    boltsCount
    gradeContext
    type {
      trad
      sport
      bouldering
      deepwatersolo
      alpine
      snow
      ice
      mixed
      aid
      tr
    }
    safety
    metadata {
      lat
      lng
      left_right_index
      leftRightIndex
      mp_id
      climb_id
      climbId
    }
    content {
      description
      location
      protection
    }
    pathTokens
    ancestors
    yds
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
