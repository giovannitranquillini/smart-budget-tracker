import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // read paths from tsconfig.json
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    passWithNoTests: true,
    // unit tests run with `pnpm test`, integration tests (they need Docker) with `pnpm test:integration`
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] } },
      { extends: true, test: { name: 'integration', include: ['tests/integration/**/*.test.ts'] } },
    ],
  },
});
