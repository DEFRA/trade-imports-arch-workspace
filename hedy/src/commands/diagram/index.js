import { register as registerSequence } from './sequence.js'

export const register = (program, deps) => {
  const group = program.command('diagram').description('Draw diagrams from their sources')
  registerSequence(group, deps)
}
