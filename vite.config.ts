import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    exclude: ['**/*/fixtures', '**/*/setup.ts'],
    globals: true,
    globalSetup: './src/__tests__/setup.ts',
    environment: 'node',

    pool: 'threads',
    poolOptions: {
      threads: {
        isolate: false
      }
    }
  }
})
