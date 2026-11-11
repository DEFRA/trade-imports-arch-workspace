import { z } from 'zod'
import { createConfluenceClient } from '../clients/confluence.js'
import { createJiraClient } from '../clients/jira.js'
import { loadCredentials } from '../credentials.js'
import { runAction } from '../run-action.js'

const authOptionsSchema = z.object({}).strict()

/**
 * Probes Jira and Confluence together with the credentials from loadCredentials.
 * Rejects with the HedyError from loadCredentials before any request, or with
 * an AggregateError holding each failing service's error, Jira first.
 *
 * @param {{ env: Record<string, string | undefined>, workspaceRoot: () => string }} options
 * @returns {Promise<{ jira: { displayName: string | null }, confluence: { displayName: string | null } }>}
 */
export const runAuth = async ({ env, workspaceRoot }) => {
  const credentials = loadCredentials({ env, workspaceRoot })
  const [jira, confluence] = await Promise.allSettled([
    createJiraClient(credentials).whoami(),
    createConfluenceClient(credentials).whoami()
  ])
  const failures = [jira, confluence].filter(({ status }) => status === 'rejected').map(({ reason }) => reason)
  if (failures.length > 0) throw new AggregateError(failures, 'Authentication failed')
  return { jira: jira.value, confluence: confluence.value }
}

const statusText = ({ displayName }) => `ok as ${displayName ?? 'an account with no display name'}`

/**
 * Returns the Jira row, then the Confluence row, each "ok as" the account's
 * display name, or "ok as an account with no display name" when the name is
 * null.
 *
 * @param {{ jira: { displayName: string | null }, confluence: { displayName: string | null } }} result
 * @returns {[string, string][]}
 */
export const authRows = ({ jira, confluence }) => [
  ['Jira', statusText(jira)],
  ['Confluence', statusText(confluence)]
]

const renderAuth = (result) =>
  authRows(result).map(([service, status]) => `${service.toLowerCase()}: ${status}`).join('\n')

export const register = (program, { stdout, stderr, setExitCode, env, workspaceRoot }) => {
  program
    .command('auth')
    .description('Check the Jira and Confluence credentials, reporting names only')
    .action((options, command) => runAction(() => {
      authOptionsSchema.parse(options)
      return runAuth({ env, workspaceRoot })
    }, {
      json: command.optsWithGlobals().json === true,
      render: renderAuth,
      stdout,
      stderr,
      setExitCode
    }))
}
