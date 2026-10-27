import { z } from 'zod'
import { createJiraClient } from '../../clients/jira.js'
import { loadCredentials } from '../../credentials.js'
import { runAction } from '../../run-action.js'

const MAX_MESSAGE = '--max must be a whole number greater than 0. Run the command again with a value such as 50.'

const searchInputSchema = z.object({
  jql: z.string().regex(/\S/, 'The JQL query is empty. Give a query such as "project = ABC", then run the command again.'),
  max: z.coerce.number(MAX_MESSAGE).int({ error: MAX_MESSAGE, abort: true }).positive(MAX_MESSAGE)
})

/**
 * Returns the Jira client's search result for jql: { issues }, at most max of them.
 * Rejects with the HedyError from loadCredentials before any request.
 *
 * @param {{ jql: string, max: number, env: Record<string, string | undefined>, workspaceRoot: () => string }} options
 */
export const runSearch = async ({ jql, max, env, workspaceRoot }) =>
  createJiraClient(loadCredentials({ env, workspaceRoot })).search(jql, { max })

const renderSearch = ({ issues }) => issues.length === 0
  ? 'No issues match the query.'
  : issues.map(({ key, status, summary }) => `${key}  ${status ?? 'none'}  ${summary}`).join('\n')

export const register = (group, { stdout, stderr, setExitCode, env, workspaceRoot }) => {
  group
    .command('search')
    .description('List the Jira issues a JQL query matches, one line each')
    .argument('<jql>', 'The JQL query, quoted as one argument')
    .option('--max <n>', 'Return at most this many issues', 200)
    .action((jql, options, command) => runAction(() => {
      const validated = searchInputSchema.parse({ jql, max: options.max })
      return runSearch({ ...validated, env, workspaceRoot })
    }, {
      json: command.optsWithGlobals().json === true,
      render: renderSearch,
      stdout,
      stderr,
      setExitCode
    }))
}
