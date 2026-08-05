import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, test, beforeEach, afterEach, expect } from 'vitest'

import { addPackageManager } from '../utils/add-package-manager.js'

const projectName = 'pinned-app'

let workspace: string
let previousCwd: string
let previousUserAgent: string | undefined

/** Mirrors what `buildDependencies` leaves behind for this step to amend. */
const writeManifest = () => {
  writeFileSync(
    join(workspace, projectName, 'package.json'),
    `${JSON.stringify({ name: '{{ PROJECT_NAME }}', version: '0.0.0', scripts: {} }, null, 2)}\n`,
  )
}

const readManifest = () =>
  JSON.parse(readFileSync(join(workspace, projectName, 'package.json'), 'utf8')) as Record<
    string,
    unknown
  >

beforeEach(() => {
  previousCwd = process.cwd()
  previousUserAgent = process.env.npm_config_user_agent

  workspace = mkdtempSync(join(tmpdir(), 'create-j1ma-pin-'))

  mkdirSync(join(workspace, projectName))
  writeManifest()

  // The util resolves the project against the working directory, the same way
  // every other generator step does.
  process.chdir(workspace)
})

afterEach(() => {
  process.chdir(previousCwd)

  if (previousUserAgent === undefined) {
    delete process.env.npm_config_user_agent
  } else {
    process.env.npm_config_user_agent = previousUserAgent
  }

  rmSync(workspace, { recursive: true, force: true })
})

describe('addPackageManager', () => {
  test('pins the version carried by the user agent', async () => {
    process.env.npm_config_user_agent = 'pnpm/10.15.0 npm/? node/v24.17.0'

    await addPackageManager({ packageManager: 'pnpm', projectName })

    expect(readManifest().packageManager).toBe('pnpm@10.15.0')
  })

  test('keeps the field directly after version', async () => {
    process.env.npm_config_user_agent = 'pnpm/10.15.0 npm/? node/v24.17.0'

    await addPackageManager({ packageManager: 'pnpm', projectName })

    expect(Object.keys(readManifest())).toEqual(['name', 'version', 'packageManager', 'scripts'])
  })

  test('falls back to the executable when the user agent has no usable version', async () => {
    // pnpm reports other managers as `npm/?`. Picking npm from the prompt while
    // running under pnpm must not pin that placeholder.
    process.env.npm_config_user_agent = 'pnpm/10.15.0 npm/? node/v24.17.0'

    await addPackageManager({ packageManager: 'npm', projectName })

    expect(readManifest().packageManager).toMatch(/^npm@\d+\.\d+\.\d+/)
  })

  test('falls back when there is no user agent at all', async () => {
    // The path taken whenever the manager came from the prompt.
    delete process.env.npm_config_user_agent

    await addPackageManager({ packageManager: 'npm', projectName })

    expect(readManifest().packageManager).toMatch(/^npm@\d+\.\d+\.\d+/)
  })

  test('leaves bun unpinned', async () => {
    // Corepack cannot provision bun and bun ignores the field.
    process.env.npm_config_user_agent = 'bun/1.2.0 npm/? node/v24.17.0'

    await addPackageManager({ packageManager: 'bun', projectName })

    expect(readManifest()).not.toHaveProperty('packageManager')
  })
})
