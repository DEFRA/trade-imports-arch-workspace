import { register as registerPage } from './page.js'
import { register as registerPublish } from './publish.js'

export const register = (program, deps) => {
  const group = program.command('confluence').description('Read and publish Confluence pages')
  registerPage(group, deps)
  registerPublish(group, deps)
}
