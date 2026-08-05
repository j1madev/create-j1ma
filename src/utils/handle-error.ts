import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { cancel } from '@clack/prompts'

export async function handleError({ error, projectName }: { error: unknown; projectName: string }) {
  if (error instanceof Error) {
    // An `exec` rejection reports only `Command failed: pnpm install`; the
    // reason lives on `stderr`. Dropping it leaves nothing to debug, since the
    // project directory is removed moments later.
    const { stderr } = error as Error & { stderr?: string }

    cancel([error.message, stderr?.trim()].filter(Boolean).join('\n\n'))
  }

  await rm(join(process.cwd(), projectName), { recursive: true, force: true })

  process.exit(1)
}
