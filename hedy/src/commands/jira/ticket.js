import { z } from 'zod'
import { createJiraClient } from '../../clients/jira.js'
import { loadCredentials } from '../../credentials.js'
import { runAction } from '../../run-action.js'
import { issueKeySchema } from './issue-key.js'
import { rowValueText } from './plan.js'

const ticketArgumentsSchema = z.object({ key: issueKeySchema })

/**
 * Returns the Jira client's issue projection for key, description included.
 * Rejects with the HedyError from loadCredentials before any request.
 *
 * @param {{ key: string, env: Record<string, string | undefined>, workspaceRoot: () => string }} options
 */
export const runTicket = async ({ key, env, workspaceRoot }) =>
  createJiraClient(loadCredentials({ env, workspaceRoot })).issue(key)

/**
 * Returns the issue's field rows, with the labels joined by commas and none
 * for each empty value.
 *
 * @returns {[string, string][]}
 */
export const ticketRows = (ticket) => [
  ['Status', ticket.status],
  ['Type', ticket.type],
  ['Priority', ticket.priority],
  ['Assignee', ticket.assignee],
  ['Labels', ticket.labels],
  ['Parent', ticket.parent],
  ['Created', ticket.created],
  ['Updated', ticket.updated],
  ['URL', ticket.url]
].map(([label, value]) => [label, rowValueText(value)])

const renderTicket = (ticket) => [
  `${ticket.key}  ${ticket.summary}`,
  ...ticketRows(ticket).map(([label, value]) => `${`${label}:`.padEnd(10)}${value}`),
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
