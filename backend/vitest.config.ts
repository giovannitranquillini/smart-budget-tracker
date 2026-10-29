import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // read paths from tsconfig.json
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
});
