import { register as registerCreate } from './create.js'
import { register as registerDescribe } from './describe.js'
import { register as registerSearch } from './search.js'
import { register as registerTicket } from './ticket.js'

export const register = (program, deps) => {
  const group = program.command('jira').description('Read and write Jira issues')
  registerTicket(group, deps)
  registerSearch(group, deps)
  registerCreate(group, deps)
  registerDescribe(group, deps)
}
