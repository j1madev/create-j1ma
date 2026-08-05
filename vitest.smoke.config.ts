import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/test/**/*.smoke.test.ts'],
    // A scaffold runs a full dependency install before it can lint, and the
    // Next.js templates are the heavy ones.
    testTimeout: 15 * 60 * 1000,
    hookTimeout: 60 * 1000,
    // Four concurrent installs thrash the pnpm store and the network for no
    // gain, and interleaved output makes a failure hard to read.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
})
