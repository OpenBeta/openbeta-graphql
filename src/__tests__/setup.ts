import 'dotenv/config';
import { beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Database } from '@schema';

// Test database setup
let testDb: Database;

beforeAll(async () => {
  // Use test database URL from environment or fallback to default
  const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!testDatabaseUrl) {
    throw new Error('Database URL not provided. Set DATABASE_URL or TEST_DATABASE_URL environment variable.');
  }
  
  testDb = drizzle(testDatabaseUrl);
  
  // Setup test data here if needed
  console.log('Test database connected');
});

afterAll(async () => {
  // Cleanup test data here if needed
  console.log('Test database cleanup complete');
});

export { testDb };