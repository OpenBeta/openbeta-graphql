#!/usr/bin/env bun
import { faker } from '@faker-js/faker';
import * as schema from '@schema';
import { range } from '__tests__/faker';
import { initializeGradeSystemsInDatabase } from '__tests__/faker/seed';
import { EntityId } from 'beta/entity_model';
import { AreaRepo } from 'beta/repo/area';
import { ClimbRepo } from 'beta/repo/climb';
import { ContentRepo } from 'beta/repo/content';
import { countries, ICountry, TCountryCode } from 'countries-list';
import { InferSelectModel } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import ora from 'ora';
import { GraphNode, graphServer } from './seed/graph/server';
import { mapServer } from './seed/map/server';
import {
  argv,
  choose,
  ensureCentroids,
  getPointNearby,
  log,
  makeUsers,
} from './seed/utils';

// in open-tacos the UI seems hardcoded to reach out to the USA as default,
// for now, we will set this up for at least one country
let arbitraryHardCoding: string | undefined =
  '1db1e8ba-a40e-587c-88a4-64f5ea814b8e';
const db = drizzle(process.env.DATABASE_URL!, { logger: argv.querylog });
const users = await makeUsers(db);
const skipCountries = ['Antarctica', 'Israel'];
export const graph: GraphNode = {
  author: -1,
  id: -1,
  name: 'world',
  type: 'area',
  children: [],
};

async function addMedia(
  forEntity: EntityId,
  forEntityKind: schema.EntityKind,
  node: GraphNode,
) {
  const images = await db
    .insert(schema.media)
    .values(
      range((Math.random() * 10) + 1).map((_) => {
        const width = faker.number.int({ min: 1, max: 10 }) * 100;
        const height = faker.number.int({ min: 1, max: 10 }) * 100;
        const image = faker.image.url({ width, height });
        return {
          author: choose(users).id,
          mediaUrl: image,
          width,
          height,
          format: 'jpg',
          size: width * height,
        };
      }),
    )
    .returning();
  // create tags for each created image
  await db.insert(schema.tag).values(
    images.map((i) => ({
      mediaId: i.id,
      targetId: forEntity,
      targetEntityKind: forEntityKind,
    })),
  );
  for (const img of images) {
    node.children.push({
      id: `img-${img.id}`,
      name: 'image',
      type: 'media',
      author: img.author,
      children: [],
    });
  }
}

async function addContent(forEntity: EntityId) {
  new ContentRepo(db, choose(users)).create({
    parent: forEntity,
    name: 'Description',
    text: faker.lorem.paragraph(),
  });
  if (Math.random() > 0.5) {
    new ContentRepo(db, choose(users)).create({
      parent: forEntity,
      name: 'Location',
      text: faker.lorem.paragraph(),
    });
  }

  if (Math.random() > 0.5) {
    new ContentRepo(db, choose(users)).create({
      parent: forEntity,
      name: 'Protection',
      text: faker.lorem.paragraph(),
    });
  }
}

async function buildAreaTree(
  countryData: ICountry & { location: { x: number; y: number } },
  countryCode: string,
) {
  type AreaSelect = InferSelectModel<typeof schema.area>;
  const maxDepth = argv.depth;
  if (skipCountries.includes(countryData.name)) {
    throw new Error('Skipped country');
  }

  let extra: { uuid?: string } = {};
  if (arbitraryHardCoding !== undefined) {
    extra.uuid = `${arbitraryHardCoding}`;
    arbitraryHardCoding = undefined;
  }

  if (!countryData.location) throw new Error('Country is missing a centroid');

  async function entityReify(entityType: schema.EntityKind, name?: string) {
    return await db
      .insert(schema.entity)
      .values({ entityType, name, ...extra })
      .returning()
      .then((d) => {
        log(
          `Reified entity ${d[0].id} of type ${entityType} with name ${name}`,
        );
        return d[0].id;
      });
  }

  const [country] = await db
    .insert(schema.area)
    .values({
      name: countryData.name,
      id: await entityReify('area', countryData.name),
      location: countryData.location,
      ...extra,
    })
    .returning();

  const countryNode: GraphNode = {
    ...country,
    author: -1,
    children: [],
    type: 'area',
  };

  graph.children.push(countryNode);
  log(`Added country node: ${country.name}`);

  async function branch(
    node: GraphNode,
    from: AreaSelect,
    currentDepth: number,
    initialScatterRadius: number,
  ) {
    for (const _ in range(Math.floor(Math.random() * argv.bredth))) {
      const user = choose(users);
      const repo = new AreaRepo(db, user);
      if (from.location === null) throw new Error('MISSING LOCATION ON PARENT');
      const nextLocation = getPointNearby(
        from.location,
        1,
        argv['initial-scatter-radius'],
      );

      await repo
        .create({
          name: faker.food.adjective() + ' ' + faker.food.ingredient(),
          parent: from.id,
          location: nextLocation,
        })
        .then(async (child) => {
          log(`⛰️ Created area: ${child.name} with parent ${from.name}`);
          const nextNode: GraphNode = {
            author: user.id,
            id: child.id,
            name: child.name,
            children: [],
            type: 'area',
          };
          node.children.push(nextNode);
          if (Math.random() > argv.randomness / 2) {
            await addMedia(child.id, 'area', node);
          }

          if (Math.random() > 0.5) {
            await addContent(child.id);
          }

          // to create depths of various depths, we include some randomness
          // here in terms of early-exit
          if (Math.random() > argv.randomness) return;
          // always stop if we exceed the max depth
          if (currentDepth >= argv.depth) {
            await addClimbs(nextNode, child.id, nextLocation);
            return;
          }

          await branch(
            nextNode,
            child,
            currentDepth + 1,
            argv['initial-scatter-radius'],
          );
        })
        .catch(console.error);
    }
  }

  await branch(countryNode, country, 0, argv['initial-scatter-radius']);
}

async function addClimbs(
  node: GraphNode,
  area: EntityId,
  location: { x: number; y: number },
) {
  for (const _ in range(Math.random() * argv.bredth)) {
    let user = choose(users);
    let repo = new ClimbRepo(db, user);
    let climbType = choose(schema.enums.Discipline.enumValues);
    await repo
      .create({
        parent: area,
        name: faker.animal.petName(),
        fa: faker.person.fullName(),
        length: ['trad', 'aid', 'sport', 'top_rope'].includes(climbType)
          ? faker.number.int({ min: 10, max: 100 })
          : 0,
        boltsCount: climbType == 'sport'
          ? faker.number.int({ min: 0, max: 24 })
          : null,
        type: climbType,
        safety: null,
        canonicalGrade: null,
        location: getPointNearby(location, 1, 2),
      })
      .then(async (climb) => {
        log(`🧗 Created climb: ${climb.name} in area ${area}`);
        const nextNode: GraphNode = {
          ...climb,
          author: user.id,
          name: climb.name,
          children: [],
          type: 'climb',
        };
        node.children.push(nextNode);
        await addContent(climb.id);
        await addMedia(climb.id, 'climb', nextNode);
      })
      .catch(console.error);
  }
}

async function main() {
  await initializeGradeSystemsInDatabase(db);
  log('Initialized grade systems in database.');
  const countryCentroids = await ensureCentroids();

  if (argv.graph) {
    graphServer(argv.port, graph);
  } else if (argv.map) {
    mapServer(argv.port, db);
  }

  let countryCodes = Object.keys(countries) as TCountryCode[];
  if (argv.alphabetical) {
    countryCodes.sort((a, b) =>
      countries[a].name.localeCompare(countries[b].name)
    );
  } else {
    // Randomize if not alphabetical
    countryCodes = countryCodes.sort(() => Math.random() - 0.5);
  }

  if (argv.countries !== null) {
    countryCodes = countryCodes.slice(0, argv.countries);
  }

  for (const countryCode of countryCodes) {
    const country = countries[countryCode as TCountryCode];
    log(`Building area tree for country: ${country.name}`);
    const spinner = ora(`🌱 Seeding ${country.name}...`).start();

    await buildAreaTree(
      { ...country, location: countryCentroids[countryCode] },
      countryCode,
    )
      .then(() =>
        spinner.succeed(
          `Finished ${country.name} ${choose(['🌳', '🌲', '🪴', '🌿', '🌵'])}`,
        )
      )
      .catch((err) => {
        if (argv.verbose) console.error(err);
        spinner.fail(`${country.name} ${String(err)}`);
      });
  }
}

await main().catch((err) => {
  console.error(err);
  process.exit(1);
});
