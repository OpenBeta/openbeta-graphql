/// <reference types="vitest" />
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['src.mongo/**'],
    include: ['src/__tests__/**/*.test.ts'],
    globalSetup: ['./src/__tests__/global-setup.ts'],
  },
  plugins: [tsconfigPaths()],
});
