import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    exclude: ['**/*/fixtures'],
    globals: true,
    environment: 'node',

    pool: 'threads',
    poolOptions: {
      threads: {
        isolate: false
      }
    }
  }
})
