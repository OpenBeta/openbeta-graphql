import { faker } from '@faker-js/faker';
import * as schema from '@schema';
import { range } from '__tests__/faker';
import {
  initializeGradeSystemsInDatabase,
  TestActor,
} from '__tests__/faker/seed';
import { EntityId } from 'beta/entity_model';
import { AreaRepo } from 'beta/repo/area';
import { ClimbRepo } from 'beta/repo/climb';
import { countries, ICountry, TCountryCode } from 'countries-list';
import { InferSelectModel, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import ora from 'ora';
import process from 'process';

const useGraph = process.argv.includes('--graph');
const verbose = process.argv.includes('--verbose');
const depth = process.argv.includes('--depth')
  ? parseInt(process.argv[process.argv.indexOf('--depth') + 1])
  : 5;
const randomness = process.argv.includes('--randomness')
  ? parseFloat(process.argv[process.argv.indexOf('--randomness') + 1])
  : 0.7;
const port = process.argv.includes('--port')
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1])
  : 3000;
const bredth = process.argv.includes('--bredth')
  ? parseInt(process.argv[process.argv.indexOf('--bredth') + 1])
  : 10;
const countryLimit = process.argv.includes('--countries')
  ? parseInt(process.argv[process.argv.indexOf('--countries') + 1])
  : null;
const alphabeticalCountries = process.argv.includes('--alphabetical');

function log(message: string) {
  if (!useGraph && verbose) {
    console.log(message);
  }
}

// in open-tacos the UI seems hardcoded to reach out to the USA as default,
// for now, we will set this up for at least one country
let arbitraryHardCoding: string | undefined =
  '1db1e8ba-a40e-587c-88a4-64f5ea814b8e';

const db = drizzle(process.env.DATABASE_URL!);

export type GraphNode = {
  author: EntityId;
  id: EntityId;
  name: string;
  type: 'area' | 'climb' | 'media' | 'content';
  children: GraphNode[];
};

export const graph: GraphNode = {
  author: -1,
  id: -1,
  name: 'world',
  type: 'area',
  children: [],
};

async function generateUsers(number: number) {
  return await db
    .insert(schema.user)
    .values(
      range(number).map(() => {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();

        return {
          username: faker.internet.username({ firstName, lastName }),
          displayname: faker.internet.displayName({ firstName, lastName }),
          email: faker.internet.email({
            firstName,
            lastName,
            provider: 'testing.openbeta.io',
          }),
        };
      }),
    )
    .returning()
    .then((d) => d.map((x) => new TestActor(x)));
}

const users: TestActor[] = await generateUsers(20);
log(`Generated ${users.length} users.`);
const skipCountries = ['Antarctica', 'Israel'];

function choose<T>(from: T[]): T {
  return from[Math.floor(Math.random() * from.length)];
}

async function buildAreaTree(countryData: ICountry) {
  type AreaSelect = InferSelectModel<typeof schema.area>;
  const maxDepth = depth;
  if (skipCountries.includes(countryData.name)) {
    throw new Error('Skipped country');
  }

  let extra: { uuid?: string } = {};
  if (arbitraryHardCoding !== undefined) {
    extra.uuid = `${arbitraryHardCoding}`;
    arbitraryHardCoding = undefined;
  }

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
  ) {
    for (const _ in range(Math.floor(Math.random() * bredth))) {
      const user = choose(users);
      const repo = new AreaRepo(db, user);

      await repo
        .create({
          name: faker.food.adjective() + ' ' + faker.food.ingredient(),
          parent: from.id,
        })
        .then(async (child) => {
          log(`⛰️ Created area: ${child.name} with parent ${from.name}`);
          const nextNode: GraphNode = { // FIX: Corrected nextNode creation to use `child` properties
            author: user.id,
            id: child.id,
            name: child.name,
            children: [],
            type: 'area',
          };
          node.children.push(nextNode);

          // to create depths of various depths, we include some randomness
          // here in terms of early-exit
          if (Math.random() > randomness) return;

          // always stop if we exceed the max depth
          if (currentDepth >= maxDepth) {
            await addClimbs(nextNode, child.id);
            return;
          }

          await branch(nextNode, child, currentDepth + 1);
        })
        .catch(console.error);
    }
  }

  await branch(countryNode, country, 0);
}

async function addClimbs(node: GraphNode, area: EntityId) {
  for (const _ in range(Math.random() * bredth)) {
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
      })
      .then((climb) => {
        log(`🧗 Created climb: ${climb.name} in area ${area}`);
        node.children.push({
          ...climb,
          author: user.id,
          name: climb.name,
          children: [],
          type: 'climb',
        });
      })
      .catch(console.error);
  }
}

async function main() {
  await initializeGradeSystemsInDatabase(db);
  log('Initialized grade systems in database.');

  if (useGraph) {
    // @ts-ignore
    Bun.serve({
      port: port,
      // @ts-ignore
      fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === '/') {
          // @ts-ignore
          return new Response(Bun.file('./scripts/seed/index.html'));
        }

        if (url.pathname === '/seed-graph-client.js') {
          // @ts-ignore
          return new Response(Bun.file('./scripts/seed/seed-graph-client.js'));
        }

        if (url.pathname === '/graph-data') {
          // Serve the graph data as JSON
          return new Response(JSON.stringify(graph), {
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        return new Response('Not Found', { status: 404 });
      },
    });

    console.log(
      `Graph visualizer running at http://localhost:${port}. Open this URL in your browser manually to see the graph.`,
    );
  }

  let countryCodes = Object.keys(countries) as TCountryCode[];

  if (alphabeticalCountries) {
    countryCodes.sort((a, b) =>
      countries[a].name.localeCompare(countries[b].name)
    );
  } else {
    // Randomize if not alphabetical
    countryCodes = countryCodes.sort(() => Math.random() - 0.5);
  }

  if (countryLimit !== null) {
    countryCodes = countryCodes.slice(0, countryLimit);
  }

  for (const countryCode of countryCodes) {
    const country = countries[countryCode as TCountryCode];
    log(`Building area tree for country: ${country.name}`);
    const spinner = ora(`🌱 Seeding ${country.name}...`).start();

    await buildAreaTree(country)
      .then(() =>
        spinner.succeed(
          `Finished ${country.name} ${choose(['🌳', '🌲', '🪴', '🌿', '🌵'])}`,
        )
      )
      .catch((err) => {
        spinner.fail(`${country.name} ${String(err)}`);
      });
  }
}

await main().catch((err) => {
  console.error(err);
  process.exit(1);
});
