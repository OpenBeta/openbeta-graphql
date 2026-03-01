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
import { seedContent } from './seed/mongo/content';
import { seedMedia, seedOrganizations, seedTicks } from './seed/mongo/other';
import { seedUsers } from './seed/mongo/users';
import { slc } from './seed/utils';

dotenv.config();

const logFile = 'seed.log';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

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

      const grades = slc(db, seedDefaultGrades);
      const gradeCheck = slc(db, checkGrades);
      const users = slc(db, seedUsers);
      const areaReify = slc(db, createAreaEntities);
      const climbReify = areaReify
        .then(() => slc(db, seedClimbEntities));

      const areaDetails = Promise
        .all([areaReify])
        .then(() => slc(db, seedAreaDetailsAndParents));

      const climbDetails = Promise
        .all([climbReify, grades, gradeCheck])
        .then(() => slc(db, seedClimbEntities));

      // const content = Promise
      //   .all([climbReify, areaReify])
      //   .then(() => slc(db, seedContent));

      const ticks = Promise
        .all([users, climbDetails])
        .then(() => slc(db, seedTicks));

      const media = Promise
        .all([climbReify, areaReify])
        .then(() => slc(db, seedMedia));

      const orgs = Promise
        .all([areaReify, users])
        .then(() => slc(db, seedOrganizations));

      await Promise.all([
        grades,
        gradeCheck,
        users,
        climbReify,
        // content,
        ticks,
        media,
        orgs,
        areaDetails,
        areaReify,
        climbDetails,
      ]);

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
