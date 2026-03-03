import { Spinner } from '@topcli/spinner';
import * as CliProgress from 'cli-progress';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as fs from 'fs';
import pg from 'pg';
import { seedDefaultGrades } from './gradeManager/grades';
import { graphServer } from './seed/graph/server';
import { mapServer } from './seed/map/server';
import {
  createAreaEntities,
  seedAreaDetailsAndParents,
} from './seed/mongo/area';
import { argv } from './seed/mongo/args';
import {
  checkGrades,
  seedClimbDetails,
  seedClimbEntities,
} from './seed/mongo/climbs';
import { processEntityContent } from './seed/mongo/content';
import { seedMedia, seedOrganizations, seedTicks } from './seed/mongo/other';
import { seedUsers } from './seed/mongo/users';

dotenv.config();

const logFile = 'seed.log';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

function collectTasks(): Array<[string, Promise<void>]> {
  const grades = seedDefaultGrades(db);
  const gradeCheck = checkGrades(db);
  const users = seedUsers(db);
  const areaReify = createAreaEntities(db);
  const climbReify = areaReify.then(() => seedClimbEntities(db));
  const areaDetails = areaReify.then(() => seedAreaDetailsAndParents(db));

  const climbDetails = Promise
    .all([climbReify, grades, gradeCheck])
    .then(() => seedClimbDetails(db));

  const contentForClimbs = Promise
    .all([climbReify])
    .then(() => processEntityContent(db, 'climbs'));

  const contentForAreas = Promise
    .all([areaReify])
    .then(() => processEntityContent(db, 'areas'));

  const ticks = Promise
    .all([users, climbDetails])
    .then(() => seedTicks(db));

  const media = Promise
    .all([climbReify, areaReify])
    .then(() => seedMedia(db));

  const orgs = Promise
    .all([areaReify, users])
    .then(() => seedOrganizations(db));

  return [
    ['Seeding default grades', grades],
    ['Checking mongo grade mapping', gradeCheck],
    ['Seeding users', users],
    ['Reify Climb Entities', climbReify],
    ['ticks', ticks],
    ['media', media],
    ['organizations', orgs],
    ['Assign area details', areaDetails],
    ['Reify Area Entities', areaReify],
    ['Assign climb Details', climbDetails],
    ['Add content for climbs', contentForClimbs],
    ['Add content for areas', contentForAreas],
  ];
}

async function main() {
  try {
    if (argv.map) {
      mapServer(argv.port, db);
    }
    if (argv.graph) {
      graphServer(argv.port, db);
    }

    if (!argv.onlyserver) {
      console.log = (...varargs) => {
        fs.appendFileSync(logFile, varargs.map(String).join(' ') + '\n');
      };

      const wrappedTasks = collectTasks()
        .map(([name, task]) => [name, task, new Spinner().start(name)] as const)
        .map(([name, task, spinner]) =>
          task
            .then(() => spinner.succeed())
            .catch((err) => {
              console.error(err);
              spinner.failed(err);
            })
        );

      await Promise.all(wrappedTasks);

      console.log('Seeding complete!!');
    }
  } catch (e) {
    console.error('Seeding failed:', e);
  } finally {
    if (!argv.map && !argv.graph) {
      await pool.end();
    }
  }
}

main();
