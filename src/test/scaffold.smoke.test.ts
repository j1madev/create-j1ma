import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { execaCommandSync } from 'execa'
import { describe, test, afterAll, expect } from 'vitest'

import { TEMPLATES, type Template } from '../constants/templates.js'

const CLI_PATH = join(__dirname, '..', '..', 'build', 'index.js')

const projectName = 'smoke-app'

/**
 * The generator prompts for a package manager unless it can detect one, and
 * pnpm refuses to purge `node_modules` without a TTY. Both are settled here so
 * the run is non-interactive.
 */
const env = {
  CI: 'true',
  npm_config_user_agent: `pnpm/${execaCommandSync('pnpm --version').stdout.trim()} npm/? node/${process.version}`,
}

/**
 * Scaffolding runs a real install, so these live well outside the repository:
 * a nested `node_modules` would otherwise be walked by the repo's own ESLint
 * and Prettier runs.
 */
const workspaces: string[] = []

const createWorkspace = (prefix: string) => {
  const workspace = mkdtempSync(join(tmpdir(), prefix))

  workspaces.push(workspace)

  return workspace
}

afterAll(() => {
  for (const workspace of workspaces) {
    rmSync(workspace, { recursive: true, force: true })
  }
})

/**
 * Guards the generated toolchain end to end: a scaffold is only healthy if its
 * dependency set actually resolves and its lint script runs.
 *
 * This exists because Dependabot bumps `src/dependencies/*` with no lockfile to
 * resolve peers against. It once raised ESLint to 10 on its own, which left
 * every template with an `eslint-plugin-react` that peers `^9.7` — `pnpm run
 * lint` crashed on a fresh scaffold and nothing in CI noticed.
 */
describe.each(Object.keys(TEMPLATES) as Template[])('%s scaffold', (template) => {
  const workspace = createWorkspace(`create-j1ma-${template}-`)
  const projectPath = join(workspace, projectName)

  test('pins its package manager, resolves peers and lints clean', () => {
    execaCommandSync(`node ${CLI_PATH} ${projectName} --template ${template}`, {
      cwd: workspace,
      env,
    })

    const pkgJson = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf8')) as {
      packageManager?: string
    }

    // A CI runner using pnpm/action-setup without an explicit `version:` reads
    // this field and fails the workflow when it is missing.
    expect(pkgJson.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+/)

    // Re-resolving in the project itself proves nothing: pnpm skips resolution
    // — and therefore the peer check — while the lockfile is current. A bare
    // copy of the manifest has no lockfile, so this resolves from scratch, and
    // `--lockfile-only` keeps it to a few seconds by never linking anything.
    // The payoff is a failure that names the offending ranges outright,
    // instead of whatever the first incompatible plugin happens to throw.
    const resolvePath = createWorkspace(`create-j1ma-${template}-peers-`)

    for (const file of ['package.json', 'pnpm-workspace.yaml']) {
      if (existsSync(join(projectPath, file))) {
        copyFileSync(join(projectPath, file), join(resolvePath, file))
      }
    }

    const peers = execaCommandSync('pnpm install --lockfile-only --strict-peer-dependencies', {
      cwd: resolvePath,
      env,
      reject: false,
    })

    expect(peers.exitCode, `unmet peer dependencies:\n${peers.stdout}\n${peers.stderr}`).toBe(0)

    const lint = execaCommandSync('pnpm run lint', { cwd: projectPath, env, reject: false })

    expect(lint.exitCode, `pnpm run lint failed:\n${lint.stdout}\n${lint.stderr}`).toBe(0)
  })
})
