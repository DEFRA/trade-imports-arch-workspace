import { join } from 'node:path'
import { z } from 'zod'
import { credentialsFromEnv } from '../clients/atlassian.js'
import { createConfluenceClient } from '../clients/confluence.js'
import { createJiraClient } from '../clients/jira.js'
import { fillEnvFromFile } from '../env-file.js'
import { runAction } from '../run-action.js'

const authOptionsSchema = z.object({}).strict()

/**
 * Probes Jira and Confluence together with the credentials in env. Rejects with
 * the AUTH HedyError from credentialsFromEnv before any request, or with an
 * AggregateError holding each failing service's error, Jira first.
 *
 * @param {{ env: Record<string, string | undefined> }} options
 * @returns {Promise<{ jira: { displayName: string | null }, confluence: { displayName: string | null } }>}
 */
export const runAuth = async ({ env }) => {
  const credentials = credentialsFromEnv(env)
  const [jira, confluence] = await Promise.allSettled([
    createJiraClient(credentials).whoami(),
    createConfluenceClient(credentials).whoami()
  ])
  const failures = [jira, confluence].filter(({ status }) => status === 'rejected').map(({ reason }) => reason)
  if (failures.length > 0) throw new AggregateError(failures, 'Authentication failed')
  return { jira: jira.value, confluence: confluence.value }
}

const serviceLine = (service, { displayName }) =>
  `${service}: ok as ${displayName ?? 'an account with no display name'}`

const renderAuth = ({ jira, confluence }) =>
  [serviceLine('jira', jira), serviceLine('confluence', confluence)].join('\n')

export const register = (program, { stdout, stderr, setExitCode, env, workspaceRoot }) => {
  program
    .command('auth')
    .description('Check the Jira and Confluence credentials, reporting names only')
    .action((options, command) => runAction(() => {
      authOptionsSchema.parse(options)
      fillEnvFromFile(env, join(workspaceRoot(), '.env'))
      return runAuth({ env })
    }, {
      json: command.optsWithGlobals().json === true,
      render: renderAuth,
      stdout,
      stderr,
      setExitCode
    }))
}
