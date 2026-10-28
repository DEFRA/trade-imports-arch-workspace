import { resolve } from 'node:path'
import { z } from 'zod'
import { createJiraClient } from '../../clients/jira.js'
import { loadCredentials } from '../../credentials.js'
import { HedyError } from '../../errors.js'
import { runAction } from '../../run-action.js'
import { issueKeySchema } from './issue-key.js'
import { planIdOf, planIdSchema, readDescription, refuseStalePlan, renderPlan, renderWriteOutcome } from './plan.js'

const describeInputSchema = z.object({
  key: issueKeySchema,
  from: z.string({ error: '--from is missing. Give --from the path of the description file, then run the command again.' })
    .min(1, '--from is empty. Give --from the path of the description file, then run the command again.'),
  confirm: planIdSchema.optional()
})

const refuseUnstoredDescription = async (client, key, description) => {
  const readBack = await client.issue(key)
  if (readBack.description === description) return
  throw new HedyError(
    'UNKNOWN',
    `describe ${key}: Jira did not store the description sent. Read the issue with hedy jira ticket ${key}, then run the command again.`
  )
}

/**
 * Reads the description file at from, resolved against the current folder,
 * before loading credentials, then reads the issue. Without confirm,
 * resolves to the dry run. With confirm, an issue that already holds the
 * description resolves to unchanged with no update sent; a confirm that is
 * not the plan's id rejects with USAGE; else the description is replaced,
 * read back, and the result is updated.
 *
 * @param {{ key: string, from: string, confirm?: string, env: Record<string, string | undefined>, workspaceRoot: () => string }} options
 */
export const runDescribe = async ({ key, from, confirm, env, workspaceRoot }) => {
  const description = await readDescription(resolve(from))
  const client = createJiraClient(loadCredentials({ env, workspaceRoot }))
  const issue = await client.issue(key)
  const planId = planIdOf({ key, description, currentDescription: issue.description })
  const unchanged = issue.description === description
  if (confirm === undefined) return { mode: 'dry-run', planId, key: issue.key, url: issue.url, description, unchanged }
  if (unchanged) return { mode: 'unchanged', key: issue.key, url: issue.url }
  refuseStalePlan(confirm, planId)
  await client.updateDescription(key, description)
  await refuseUnstoredDescription(client, key, description)
  return { mode: 'updated', key: issue.key, url: issue.url }
}

const renderDryRun = (plan) => renderPlan({
  rows: [
    ['Plan id', plan.planId],
    ['Issue', plan.key],
    ['URL', plan.url],
    ['Unchanged', plan.unchanged ? 'yes' : 'no']
  ],
  description: plan.description,
  nextStep: `This is a dry run. Nothing was sent. Run the command again with --confirm ${plan.planId} to replace the description.`
})

const renderDescribe = (result) => result.mode === 'dry-run' ? renderDryRun(result) : renderWriteOutcome(result)

export const register = (group, { stdout, stderr, setExitCode, env, workspaceRoot }) => {
  group
    .command('describe')
    .description("Replace a Jira issue's description from a file, as a dry run unless --confirm gives the plan id")
    .argument('<key>', 'The issue key, such as ABC-123')
    .option('--from <path>', 'The path of the file that holds the new description, in Jira wiki markup')
    .option('--confirm <planId>', 'Replace the description, confirming the plan id the dry run printed')
    .action((key, options, command) => runAction(() => {
      const validated = describeInputSchema.parse({ key, from: options.from, confirm: options.confirm })
      return runDescribe({ ...validated, env, workspaceRoot })
    }, {
      json: command.optsWithGlobals().json === true,
      render: renderDescribe,
      stdout,
      stderr,
      setExitCode
    }))
}
