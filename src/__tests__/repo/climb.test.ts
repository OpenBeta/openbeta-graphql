import { faker } from '@faker-js/faker';
import { expect, test } from '../fixtures';

test('Climb Repository: Create', async ({ climbRepo, actor, country }) => {
  const newClimb = {
    name: faker.lorem.word(),
    parent: country.id,
    type: 'sport' as const,
    length: 20,
    canonicalGrade: null,
    boltsCount: 5,
    fa: faker.person.fullName(),
    safety: 'PG' as const,
    location: {
      x: faker.location.latitude(),
      y: faker.location.longitude(),
    },
  };

  const createdClimb = await climbRepo.create(actor, {
    name: newClimb.name,
    parent: newClimb.parent,
    type: newClimb.type,
    length: newClimb.length,
    canonicalGrade: newClimb.canonicalGrade,
    boltsCount: newClimb.boltsCount,
    fa: newClimb.fa,
    safety: newClimb.safety,
    location: newClimb.location,
  });

  expect(createdClimb).toBeDefined();
  expect(createdClimb.name).toBe(newClimb.name);
  expect(createdClimb.parent).toBe(country.id);
});

test('Climb Repository: Read', async ({ climbRepo, actor, country }) => {
  const newClimb = {
    name: faker.lorem.word(),
    parent: country.id,
    type: 'sport' as const,
    length: 20,
    canonicalGrade: null,
    boltsCount: 5,
    fa: faker.person.fullName(),
    safety: 'PG' as const,
    location: {
      x: faker.location.latitude(),
      y: faker.location.longitude(),
    },
  };

  const createdClimb = await climbRepo.create(actor, {
    name: newClimb.name,
    parent: newClimb.parent,
    type: newClimb.type,
    length: newClimb.length,
    canonicalGrade: newClimb.canonicalGrade,
    boltsCount: newClimb.boltsCount,
    fa: newClimb.fa,
    safety: newClimb.safety,
    location: newClimb.location,
  });

  const foundClimb = await climbRepo.get(createdClimb);
  expect(foundClimb).toBeDefined();
  expect(foundClimb.name).toBe(newClimb.name);
});

test('Climb Repository: Update', async ({ climbRepo, actor, country }) => {
  const newClimb = {
    name: faker.lorem.word(),
    parent: country.id,
    type: 'sport' as const,
    length: 20,
    canonicalGrade: null,
    boltsCount: 5,
    fa: faker.person.fullName(),
    safety: 'PG' as const,
    location: {
      x: faker.location.latitude(),
      y: faker.location.longitude(),
    },
  };

  const createdClimb = await climbRepo.create(actor, {
    name: newClimb.name,
    parent: newClimb.parent,
    type: newClimb.type,
    length: newClimb.length,
    canonicalGrade: newClimb.canonicalGrade,
    boltsCount: newClimb.boltsCount,
    fa: newClimb.fa,
    safety: newClimb.safety,
    location: newClimb.location,
  });

  const updatedClimbName = faker.lorem.word();
  await climbRepo.update(actor, createdClimb, { name: updatedClimbName });
  const updatedClimb = await climbRepo.get(createdClimb);
  expect(updatedClimb.name).toBe(updatedClimbName);
});

test('Climb Repository: Soft Delete', async ({ climbRepo, actor, country }) => {
  const newClimb = {
    name: faker.lorem.word(),
    parent: country.id,
    type: 'sport' as const,
    length: 20,
    canonicalGrade: null,
    boltsCount: 5,
    fa: faker.person.fullName(),
    safety: 'PG' as const,
    location: {
      x: faker.location.latitude(),
      y: faker.location.longitude(),
    },
  };

  const createdClimb = await climbRepo.create(actor, {
    name: newClimb.name,
    parent: newClimb.parent,
    type: newClimb.type,
    length: newClimb.length,
    canonicalGrade: newClimb.canonicalGrade,
    boltsCount: newClimb.boltsCount,
    fa: newClimb.fa,
    safety: newClimb.safety,
    location: newClimb.location,
  });

  await climbRepo.softDelete(actor, createdClimb);
  const deletedClimb = await climbRepo.get(createdClimb);
  expect(deletedClimb.deleted).toBe(true);
});

test('Climb Repository: Undelete', async ({ climbRepo, actor, country }) => {
  const newClimb = {
    name: faker.lorem.word(),
    parent: country.id,
    type: 'sport' as const,
    length: 20,
    canonicalGrade: null,
    boltsCount: 5,
    fa: faker.person.fullName(),
    safety: 'PG' as const,
    location: {
      x: faker.location.latitude(),
      y: faker.location.longitude(),
    },
  };

  const createdClimb = await climbRepo.create(actor, {
    name: newClimb.name,
    parent: newClimb.parent,
    type: newClimb.type,
    length: newClimb.length,
    canonicalGrade: newClimb.canonicalGrade,
    boltsCount: newClimb.boltsCount,
    fa: newClimb.fa,
    safety: newClimb.safety,
    location: newClimb.location,
  });

  await climbRepo.softDelete(actor, createdClimb);
  await climbRepo.unDelete(actor, createdClimb);
  const undeletedClimb = await climbRepo.get(createdClimb);
  expect(undeletedClimb.deleted).toBe(false);
});
