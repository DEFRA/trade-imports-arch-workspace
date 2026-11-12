import { register as registerCheck } from './check.js'

export const register = (program, deps) => {
  const group = program.command('prose').description('Check prose against the house language file')
  registerCheck(group, deps)
}
