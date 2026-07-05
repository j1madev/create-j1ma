import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { cancel } from '@clack/prompts'

export async function handleError({ error, projectName }: { error: unknown; projectName: string }) {
  if (error instanceof Error) {
    cancel(error.message)
  }

  await rm(join(process.cwd(), projectName), { recursive: true, force: true })

  process.exit(1)
}
