import { z } from 'zod'
import { createJiraClient } from '../../clients/jira.js'
import { loadCredentials } from '../../credentials.js'
import { runAction } from '../../run-action.js'
import { issueKeySchema } from './issue-key.js'

const ticketArgumentsSchema = z.object({ key: issueKeySchema })

/**
 * Returns the Jira client's issue projection for key, description included.
 * Rejects with the HedyError from loadCredentials before any request.
 *
 * @param {{ key: string, env: Record<string, string | undefined>, workspaceRoot: () => string }} options
 */
export const runTicket = async ({ key, env, workspaceRoot }) =>
  createJiraClient(loadCredentials({ env, workspaceRoot })).issue(key)

const fieldText = (value) => {
  const text = Array.isArray(value) ? value.join(', ') : value
  return text || 'none'
}

const renderTicket = (ticket) => [
  `${ticket.key}  ${ticket.summary}`,
  ...[
    ['Status', ticket.status],
    ['Type', ticket.type],
    ['Priority', ticket.priority],
    ['Assignee', ticket.assignee],
    ['Labels', ticket.labels],
    ['Parent', ticket.parent],
    ['Created', ticket.created],
    ['Updated', ticket.updated],
    ['URL', ticket.url]
  ].map(([label, value]) => `${`${label}:`.padEnd(10)}${fieldText(value)}`),
  '',
  ticket.description ?? '(no description)'
].join('\n')

export const register = (group, { stdout, stderr, setExitCode, env, workspaceRoot }) => {
  group
    .command('ticket')
    .description('Print one Jira issue with its fields and description')
    .argument('<key>', 'The issue key, such as ABC-123')
    .action((key, _options, command) => runAction(() => {
      const { key: validatedKey } = ticketArgumentsSchema.parse({ key })
      return runTicket({ key: validatedKey, env, workspaceRoot })
    }, {
      json: command.optsWithGlobals().json === true,
      render: renderTicket,
      stdout,
      stderr,
      setExitCode
    }))
}
