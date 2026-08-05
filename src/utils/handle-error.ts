import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { cancel } from '@clack/prompts'

export async function handleError({ error, projectName }: { error: unknown; projectName: string }) {
  if (error instanceof Error) {
    // An `exec` rejection reports only `Command failed: pnpm install`. The
    // reason sits on the captured output, and pnpm puts most of its own
    // failures on stdout rather than stderr. Dropping both leaves nothing to
    // debug, since the project directory is removed moments later.
    const { stdout, stderr } = error as Error & { stdout?: string; stderr?: string }

    cancel([error.message, stderr?.trim(), stdout?.trim()].filter(Boolean).join('\n\n'))
  }

  await rm(join(process.cwd(), projectName), { recursive: true, force: true })

  process.exit(1)
}
