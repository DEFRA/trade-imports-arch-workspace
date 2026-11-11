import { register as registerCheck } from './check.js'

export const register = (program, deps) => {
  const group = program.command('workspace').description('Check the workspace setup')
  registerCheck(group, deps)
}
