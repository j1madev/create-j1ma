import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { type PACKAGE_MANAGER } from '../constants/package-manager.js'

import { execCmd } from './exec-command.js'

/**
 * Package managers Corepack knows how to provision. Bun is intentionally
 * excluded: it neither reads nor is resolved by the `packageManager` field,
 * so pinning it there is noise at best and a Corepack error at worst.
 */
const COREPACK_MANAGERS = new Set(['npm', 'pnpm', 'yarn'])

/** Corepack only accepts a fully qualified `name@version`, never a range. */
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/

/**
 * Reads the running package manager's version out of the npm user agent,
 * which looks like `pnpm/11.17.0 npm/? node/v24.17.0`.
 *
 * Spawning `<pm> --version` costs a process, and every millisecond here lands
 * before the first spinner frame. The user agent already carries the answer
 * whenever the CLI was invoked through the manager being pinned.
 */
function getVersionFromUserAgent(packageManager: string) {
  const userAgent = process.env.npm_config_user_agent ?? ''

  const version = new RegExp(`(?:^|\\s)${packageManager}/(\\S+)`).exec(userAgent)?.[1]

  // Entries for managers other than the one that launched the CLI carry a
  // placeholder rather than a version - pnpm reports `pnpm/11.17.0 npm/?` -
  // so anything unusable has to read as absent and fall through to the spawn.
  return version && EXACT_VERSION.test(version) ? version : null
}

/**
 * Pins the package manager in the project's `package.json` via the
 * `packageManager` field.
 *
 * Without it, Corepack resolves a different version on every machine and
 * `pnpm/action-setup` fails outright unless the workflow repeats the version
 * inline. The field is written after the dependencies are merged, since
 * `buildDependencies` rewrites the whole file.
 */
export async function addPackageManager({
  packageManager,
  projectName,
}: {
  packageManager: keyof typeof PACKAGE_MANAGER
  projectName: string
}) {
  if (!COREPACK_MANAGERS.has(packageManager)) return

  let version = getVersionFromUserAgent(packageManager)

  if (!version) {
    try {
      // Only reachable when the manager was picked from the prompt rather than
      // the one that launched the CLI.
      const { stdout } = await execCmd(`${packageManager} --version`)

      version = stdout.trim()
    } catch (_error) {
      // The install step will surface a missing package manager far more
      // clearly than a half-written manifest would.
      return
    }
  }

  if (!EXACT_VERSION.test(version)) return

  const pkgJsonPath = join(process.cwd(), projectName, 'package.json')

  const {
    name,
    version: projectVersion,
    ...rest
  } = JSON.parse(await readFile(pkgJsonPath, 'utf8')) as Record<string, unknown>

  const pkgJson = {
    name,
    version: projectVersion,
    packageManager: `${packageManager}@${version}`,
    ...rest,
  }

  await writeFile(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`, 'utf8')
}
