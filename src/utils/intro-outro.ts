import { intro, outro } from '@clack/prompts'
import colors from 'picocolors'

export function showIntro() {
  intro(colors.inverse('    create-j1ma    '))
}

export function showOutro() {
  outro(colors.inverse('    Bye 👋    '))
}
