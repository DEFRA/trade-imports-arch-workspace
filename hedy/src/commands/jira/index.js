import { register as registerSearch } from './search.js'
import { register as registerTicket } from './ticket.js'

export const register = (program, deps) => {
  const group = program.command('jira').description('Read Jira issues')
  registerTicket(group, deps)
  registerSearch(group, deps)
}
