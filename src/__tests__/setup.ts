import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@schema';
import { Database } from '@schema';

// Single pool for test connections
const testDatabaseUrl = process.env.TEST_DATABASE_URL 
  || process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'Database URL not provided. Set DATABASE_URL or TEST_DATABASE_URL environment variable.',
  );
}

const pool = new Pool({ connectionString: testDatabaseUrl });

// Export the test database connection
export const testDb: Database = drizzle(pool, { schema });