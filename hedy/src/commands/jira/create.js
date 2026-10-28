import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { createJiraClient } from '../../clients/jira.js'
import { loadCredentials } from '../../credentials.js'
import { HedyError } from '../../errors.js'
import { runAction } from '../../run-action.js'
import { loadManifest } from './manifest.js'
import { buildCreatePlan, planIdSchema, refuseStalePlan, renderPlan, renderWriteOutcome } from './plan.js'

export const RECEIPT_FILENAME = 'ticket.created.json'

const createOptionsSchema = z.object({
  from: z.string().min(1, '--from is empty. Give --from the path of a ticket manifest, then run the command again.'),
  confirm: planIdSchema.optional()
})

const readReceiptText = async (path) => {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw new HedyError(
      'UNKNOWN',
      `The receipt at ${path} could not be read. Check that the path is a regular file with read permission, then run the command again.`,
      { cause: error }
    )
  }
}

const parseReceipt = (text, path) => {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new HedyError(
      'USAGE',
      `The receipt at ${path} is not JSON. Check in Jira whether the manifest's issue exists, then fix or delete the receipt and run the command again.`,
      { cause: error }
    )
  }
}

const readReceipt = async (path) => {
  const text = await readReceiptText(path)
  return text === undefined ? undefined : parseReceipt(text, path)
}

const writeReceipt = async (path, receipt) => {
  try {
    await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`)
  } catch (error) {
    throw new HedyError(
      'UNKNOWN',
      `Jira created ${receipt.key} at ${receipt.url}, but the receipt could not be written at ${path}. Write the receipt by hand before running the command again.`,
      { cause: error }
    )
  }
}

const dryRunResult = ({ planId, project, type, summary, priority, parent, labels, description, warnings }) =>
  ({ mode: 'dry-run', planId, project, type, summary, priority, parent, labels, description, warnings })

const refuseSecondIssue = (receipt, path) => {
  throw new HedyError(
    'USAGE',
    `This manifest already created ${receipt.key} at ${receipt.url}. To raise another issue, delete ${path} or start a new folder.`
  )
}

const reportExistingIssue = async (receipt, createClient) => {
  const { key, url } = await createClient().issue(receipt.key)
  return { mode: 'unchanged', key, url }
}

const createIssue = async (plan, { receiptPath, createClient }) => {
  const client = createClient()
  const { key, url } = await client.createIssue(plan.fields)
  await writeReceipt(receiptPath, { key, url, planId: plan.planId, createdAt: new Date().toISOString() })
  await client.issue(key)
  return { mode: 'created', key, url }
}

/**
 * Without confirm, resolves to the dry run of the manifest at from, resolved
 * against the current folder, and reads no credentials. With confirm, a
 * receipt beside the manifest whose planId is confirm resolves to unchanged
 * after reading the issue back; a receipt with another planId, or a confirm
 * that is not the plan's id, rejects with USAGE before any request. Else the
 * issue is created, the receipt written at once, the issue read back, and the
 * result is created.
 *
 * @param {{ from: string, confirm?: string, env: Record<string, string | undefined>, workspaceRoot: () => string }} options
 */
export const runCreate = async ({ from, confirm, env, workspaceRoot }) => {
  const { manifest, folder } = await loadManifest(resolve(from))
  const plan = await buildCreatePlan({ manifest, folder })
  if (confirm === undefined) return dryRunResult(plan)
  const receiptPath = join(folder, RECEIPT_FILENAME)
  const receipt = await readReceipt(receiptPath)
  const createClient = () => createJiraClient(loadCredentials({ env, workspaceRoot }))
  if (receipt?.planId === confirm) return reportExistingIssue(receipt, createClient)
  if (receipt) refuseSecondIssue(receipt, receiptPath)
  refuseStalePlan(confirm, plan.planId)
  return createIssue(plan, { receiptPath, createClient })
}

const renderDryRun = (plan) => renderPlan({
  rows: [
    ['Plan id', plan.planId],
    ['Project', plan.project],
    ['Type', plan.type],
    ['Summary', plan.summary],
    ['Priority', plan.priority],
    ['Parent', plan.parent],
    ['Labels', plan.labels.join(', ')],
    ['Warnings', plan.warnings]
  ],
  description: plan.description,
  nextStep: `This is a dry run. Nothing was sent. Run the command again with --confirm ${plan.planId} to create the issue.`
})

const renderCreate = (result) => result.mode === 'dry-run' ? renderDryRun(result) : renderWriteOutcome(result)

export const register = (group, { stdout, stderr, setExitCode, env, workspaceRoot }) => {
  group
    .command('create')
    .description('Create a Jira issue from a manifest, as a dry run unless --confirm gives the plan id')
    .requiredOption('--from <path>', 'The path of the ticket manifest')
    .option('--confirm <planId>', 'Create the issue, confirming the plan id the dry run printed')
    .action((options, command) => runAction(() => {
      const validated = createOptionsSchema.parse({ from: options.from, confirm: options.confirm })
      return runCreate({ ...validated, env, workspaceRoot })
    }, {
      json: command.optsWithGlobals().json === true,
      render: renderCreate,
      stdout,
      stderr,
      setExitCode
    }))
}
