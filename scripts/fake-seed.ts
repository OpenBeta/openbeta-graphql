#!/usr/bin/env bun
import { faker } from '@faker-js/faker';
import * as schema from '@schema';
import * as turf from '@turf/turf';
import { range } from '__tests__/faker';
import { initializeGradeSystemsInDatabase } from '__tests__/faker/seed';
import { EntityId } from 'beta/entity_model';
import { AreaRepo } from 'beta/repo/area';
import { ClimbRepo } from 'beta/repo/climb';
import { ContentRepo } from 'beta/repo/content';
import { countries, ICountry, TCountryCode } from 'countries-list';
import { InferSelectModel } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Feature, Polygon } from 'geojson';
import { readFile } from 'node:fs/promises';
import ora from 'ora';
import { GraphNode, graphServer } from './seed/graph/server';
import { mapServer } from './seed/map/server';
import {
  argv,
  choose,
  ensureCentroids,
  generateRandomPointsInPolygon,
  geoFile,
  loadCountryCodes,
  log,
  makeUsers,
  subdividePolygonFeature,
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

async function addContent(forEntity: EntityId, node: GraphNode) {
  let user = choose(users);
  const desc = await new ContentRepo(db).create(user, {
    parent: forEntity,
    name: 'description',
    text: faker.lorem.paragraph(),
  });

  node.children.push({
    id: desc.id,
    type: 'content',
    author: user.id,
    name: 'content',
    children: [],
  });

  if (Math.random() > 0.5) {
    const location = await new ContentRepo(db).create(user, {
      parent: forEntity,
      name: 'location',
      text: faker.lorem.paragraph(),
    });

    node.children.push({
      id: location.id,
      type: 'content',
      author: user.id,
      name: 'location',
      children: [],
    });
  }

  if (Math.random() > 0.5) {
    const protection = await new ContentRepo(db).create(user, {
      parent: forEntity,
      name: 'protection',
      text: faker.lorem.paragraph(),
    });
    node.children.push({
      id: protection.id,
      type: 'content',
      author: user.id,
      name: 'protection',
      children: [],
    });
  }
}

async function prepCountry(
  countryData: ICountry & { location: { x: number; y: number } },
  countryCode: string,
) {
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
  return [country, countryNode] as const;
}

async function buildAreaTree(
  countryData: ICountry & {
    location: { x: number; y: number };
    feature: Polygon;
  },
  countryCode: string,
) {
  type AreaSelect = InferSelectModel<typeof schema.area>;
  const maxDepth = argv.depth;
  const [country, countryNode] = await prepCountry(countryData, countryCode);

  async function branch(
    fromNode: GraphNode,
    from: AreaSelect,
    currentDepth: number,
    locationIn: Polygon,
  ) {
    const subdivisions: Polygon[] = subdividePolygonFeature(
      locationIn,
      faker.number.int({ max: argv.bredth }),
    );

    for (const subRegion of subdivisions) {
      const user = choose(users);
      const repo = new AreaRepo(db);
      if (from.location === null) throw new Error('MISSING LOCATION ON PARENT');
      const nextLocation = generateRandomPointsInPolygon(subRegion, 1)
        .features
        .map((i) => i.geometry)
        ?.[0]
        ?.coordinates;

      // This likely suggests the polygon is basically a line in terms
      // of our limited floating point precision
      if (!nextLocation) continue;

      await repo
        .create(user, {
          name: faker.food.adjective() + ' ' + faker.food.ingredient(),
          parent: from.id,
          location: { x: nextLocation[0], y: nextLocation[1] },
        })
        .then(async (child) => {
          log(`⛰️ Created area: ${child.name} with parent ${from.name}`);
          const childNode: GraphNode = {
            author: user.id,
            id: child.id,
            name: child.name,
            children: [],
            type: 'area',
          };
          fromNode.children.push(childNode);
          if (Math.random() > argv.randomness / 2) {
            await addMedia(child.id, 'area', childNode);
          }

          if (Math.random() > 0.2) {
            await addContent(child.id, childNode);
          }

          // to create depths of various depths, we include some randomness
          // here in terms of early-exit
          if (Math.random() > 0.2) {
            return await addClimbs(childNode, child.id, {
              x: nextLocation[0],
              y: nextLocation[1],
            });
          }

          if (turf.area(subRegion) > 1000 && currentDepth < argv.depth) {
            await branch(
              childNode,
              child,
              currentDepth + 1,
              subRegion,
            );
          } else {
            return await addClimbs(childNode, child.id, {
              x: nextLocation[0],
              y: nextLocation[1],
            });
          }
        })
        .catch(console.error);
    }
  }

  await branch(countryNode, country, 0, countryData.feature);
}

async function addClimbs(
  areaNode: GraphNode,
  area: EntityId,
  location: { x: number; y: number },
) {
  for (const _ in range(1 + (Math.random() * argv.bredth))) {
    let user = choose(users);
    let repo = new ClimbRepo(db);
    let climbType = choose(schema.enums.Discipline.enumValues);

    await repo
      .create(user, {
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
        location,
      })
      .then(async (climb) => {
        log(`🧗 Created climb: ${climb.name} in area ${area}`);
        const childNode: GraphNode = {
          ...climb,
          author: user.id,
          name: climb.name,
          children: [],
          type: 'climb',
        };
        areaNode.children.push(childNode);
        await addContent(climb.id, childNode);
        await addMedia(climb.id, 'climb', childNode);
      })
      .catch(console.error);
  }
}

async function main() {
  await initializeGradeSystemsInDatabase(db);
  log('Initialized grade systems in database.');
  const countryCentroids = await ensureCentroids();
  const data = JSON.parse(
    await readFile(geoFile, 'utf-8'),
  );

  if (argv.graph) {
    graphServer(argv.port, graph);
  } else if (argv.map) {
    mapServer(argv.port, db);
  }

  for (const countryCode of loadCountryCodes()) {
    const country = countries[countryCode as TCountryCode];
    log(`Building area tree for country: ${country.name}`);
    const spinner = ora(`🌱 Seeding ${country.name}...`).start();

    await buildAreaTree(
      {
        ...country,
        location: countryCentroids[countryCode],
        feature: data.features.find((i: Feature) =>
          i.properties?.iso_a2 == countryCode
        ),
      },
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
