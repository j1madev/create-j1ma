import { join } from 'node:path'

import { spinner as createSpinner, note } from '@clack/prompts'

import { addNodeVersion } from '../utils/add-node-version.js'
import { addPackageManager } from '../utils/add-package-manager.js'
import { buildDependencies } from '../utils/build-dependencies.js'
import { copyFromTemplate } from '../utils/copy-from-template.js'
import { execCmd } from '../utils/exec-command.js'
import { getNextStepsMessage } from '../utils/get-next-steps-message.js'
import { getPackageManger } from '../utils/get-package-manager.js'
import { getProjectName } from '../utils/get-project-name.js'
import { getTemplateName } from '../utils/get-template.js'
import { handleError } from '../utils/handle-error.js'
import { replaceFiles } from '../utils/read-files.js'
import { renameGitignore } from '../utils/rename-gitignore.js'
import { sleep } from '../utils/sleep.js'

export async function createProject({ template, name }: { template?: string; name?: string } = {}) {
  const packageManager = await getPackageManger()
  const spinner = createSpinner()
  const projectName = await getProjectName(name)

  const projectPath = join(process.cwd(), projectName)

  try {
    const selectedTemplate = await getTemplateName(template)

    await copyFromTemplate(selectedTemplate, projectName)
    await buildDependencies({ template: selectedTemplate, projectName })
    await addPackageManager({ packageManager, projectName })
    await copyFromTemplate('README.md', join(projectName, 'README.md'))
    await renameGitignore(projectName)
    await replaceFiles(projectName)
    await addNodeVersion(projectName)

    spinner.start('Setting up project 🚧')
    await sleep()

    try {
      // check if git is already initialized
      await execCmd('git rev-parse --is-inside-work-tree', { cwd: projectPath })
    } catch (_) {
      spinner.message('Initializing Git 🚀')

      await sleep()
      await execCmd('git init -b main', { cwd: projectPath })
    }

    spinner.message('Installing dependencies 📦')

    await execCmd(`${packageManager} install`, { cwd: projectPath })

    spinner.stop('Dependencies have been installed ✅')

    const nextStepsMessage = getNextStepsMessage(projectName, packageManager)

    note(nextStepsMessage, 'Next steps:')
  } catch (error: unknown) {
    await handleError({ error, projectName })
  }
}
