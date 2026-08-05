import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Smoke tests scaffold real projects and install real dependencies, which
    // is far too slow for the default loop. Run them with `pnpm test:smoke`.
    exclude: ['**/node_modules/**', '**/*.smoke.test.ts'],
  },
})
