import { faker } from '@faker-js/faker';
import { expect, test } from '../fixtures';

test('Area Repository: Create', async ({ areaRepo, country, actor }) => {
  const newArea = {
    name: faker.location.city(),
    parent: country.id,
    location: {
      x: faker.location.latitude(),
      y: faker.location.longitude(),
    },
  };

  const createdArea = await areaRepo.create(actor, {
    name: newArea.name,
    parent: newArea.parent,
    location: newArea.location,
  });

  expect(createdArea).toBeDefined();
  expect(createdArea.name).toBe(newArea.name);
  expect(createdArea.parent).toBe(country.id);
});

test('Area Repository: Read', async ({ areaRepo, country, actor }) => {
  const newArea = {
    name: faker.location.city(),
    parent: country.id,
    location: {
      x: faker.location.latitude(),
      y: faker.location.longitude(),
    },
  };

  const createdArea = await areaRepo.create(actor, {
    name: newArea.name,
    parent: newArea.parent,
    location: newArea.location,
  });

  const foundArea = await areaRepo.get(createdArea);
  expect(foundArea).toBeDefined();
  expect(foundArea.name).toBe(newArea.name);
});

test('Area Repository: Update', async ({ areaRepo, country, actor }) => {
  const newArea = {
    name: faker.location.city(),
    parent: country.id,
    location: {
      x: faker.location.latitude(),
      y: faker.location.longitude(),
    },
  };

  const createdArea = await areaRepo.create(actor, {
    name: newArea.name,
    parent: newArea.parent,
    location: newArea.location,
  });

  const updatedAreaName = faker.location.city();
  await areaRepo.update(actor, createdArea, { name: updatedAreaName });
  const updatedArea = await areaRepo.get(createdArea);
  expect(updatedArea.name).toBe(updatedAreaName);
});

test('Area Repository: Soft Delete', async ({ areaRepo, country, actor }) => {
  const newArea = {
    name: faker.location.city(),
    parent: country.id,
    location: {
      x: faker.location.latitude(),
      y: faker.location.longitude(),
    },
  };

  const createdArea = await areaRepo.create(actor, {
    name: newArea.name,
    parent: newArea.parent,
    location: newArea.location,
  });

  await areaRepo.softDelete(actor, createdArea);
  const deletedArea = await areaRepo.get(createdArea);
  expect(deletedArea.deleted).toBe(true);
});

test('Area Repository: Undelete', async ({ areaRepo, country, actor }) => {
  const newArea = {
    name: faker.location.city(),
    parent: country.id,
    location: {
      x: faker.location.latitude(),
      y: faker.location.longitude(),
    },
  };

  const createdArea = await areaRepo.create(actor, {
    name: newArea.name,
    parent: newArea.parent,
    location: newArea.location,
  });

  await areaRepo.softDelete(actor, createdArea);
  await areaRepo.unDelete(actor, createdArea);
  const undeletedArea = await areaRepo.get(createdArea);
  expect(undeletedArea.deleted).toBe(false);
});
