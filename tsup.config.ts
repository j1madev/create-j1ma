import { cp, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'tsup'

export default defineConfig((options) => ({
  clean: true,
  entry: ['src/index.ts'],
  outDir: 'build',
  shims: true,
  sourcemap: false,
  format: ['esm'],
  minify: !options.watch,
  onSuccess: async () => {
    const root = dirname(fileURLToPath(import.meta.url))

    // `clean` globs skip dotfiles, so a template file such as
    // `.commitlintrc.json` outlives its deletion from `src/` and keeps being
    // scaffolded into new projects. Drop each copy before rewriting it.
    await Promise.all(
      ['templates', 'dependencies'].map(async (directory) => {
        await rm(join('build', directory), { recursive: true, force: true })

        return cp(join(root, 'src', directory), join('build', directory), { recursive: true })
      }),
    )
  },
}))
