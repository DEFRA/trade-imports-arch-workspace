import { register as registerPage } from './page.js'

export const register = (program, deps) => {
  const group = program.command('confluence').description('Read Confluence pages')
  registerPage(group, deps)
}
