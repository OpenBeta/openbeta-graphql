import * as schema from '@schema';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import ora from 'ora';
import pg from 'pg';
import { seedAreas } from './seed/mongo/area';
import { seedClimbs } from './seed/mongo/climbs';
import { seedContent } from './seed/mongo/content';
import { seedMedia, seedOrganizations, seedTicks } from './seed/mongo/other';
import { seedUsers } from './seed/mongo/users';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

async function initializeGrades() {
  const existing = await db.select().from(schema.gradeSystem).limit(1);
  if (existing.length === 0) {
    const spinner = ora('Initializing grade systems...').start();
    const { initializeGradeSystemsInDatabase } = await import(
      '../src/__tests__/faker/seed'
    );
    await initializeGradeSystemsInDatabase(db);
    spinner.succeed('Initialized grade systems.');
  }
}

async function main() {
  try {
    console.log('Starting seeding...');
    await initializeGrades();
    await seedUsers(db);
    await seedAreas(db);
    await seedClimbs(db);
    await seedContent(db);
    await seedTicks(db);
    await seedMedia(db);
    await seedOrganizations(db);

    console.log('Seeding complete!');
  } catch (e) {
    console.error('Seeding failed:', e);
  } finally {
    await pool.end();
  }
}

main();
