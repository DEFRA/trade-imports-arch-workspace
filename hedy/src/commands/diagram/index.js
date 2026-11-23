import { register as registerCheck } from './check.js'
import { register as registerSequence } from './sequence.js'

export const register = (program, deps) => {
  const group = program.command('diagram').description('Check and draw diagrams from their sources')
  registerCheck(group, deps)
  registerSequence(group, deps)
}
