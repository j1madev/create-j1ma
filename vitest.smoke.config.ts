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
    // Every case shells out to a real `pnpm install`, which occasionally fails
    // for reasons that have nothing to do with the scaffold — a registry hiccup
    // or store contention. What this suite guards against (an unresolvable
    // dependency set, a crashing lint) fails identically on both attempts, so
    // a single retry drops the noise without hiding a regression.
    retry: 1,
  },
})
