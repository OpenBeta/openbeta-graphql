import 'dotenv/config';
import * as schema from '@schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { initializeGradeSystemsInDatabase } from './faker/seed';

export async function setup() {
  // Use test database URL from environment or fallback to default
  const testDatabaseUrl = process.env.TEST_DATABASE_URL
    || process.env.DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error(
      'Database URL not provided. Set DATABASE_URL or TEST_DATABASE_URL environment variable.',
    );
  }

  // Create a new database connection pool
  const pool = new Pool({
    connectionString: testDatabaseUrl,
  });

  try {
    // Create Drizzle instance for migration
    const client = await pool.connect();
    try {
      // Perform migration
      const migrationDb = drizzle(client);
      await migrate(migrationDb, { migrationsFolder: './drizzle' });

      // Create the actual test database connection
      const testDb = drizzle(pool, { schema });

      // Initialize grade systems (from existing seed)
      await initializeGradeSystemsInDatabase(testDb);

      console.log('Global test database setup complete');
    } finally {
      // Always release the client back to the pool
      client.release();
    }

    return async () => {
      try {
        // Close the database pool after all tests
        await pool.end();
        console.log('Global test database connection closed');
      } catch (error) {
        console.error('Error closing global database connection:', error);
      }
    };
  } catch (error) {
    console.error('Global test database setup failed:', error);
    throw error;
  }
}
