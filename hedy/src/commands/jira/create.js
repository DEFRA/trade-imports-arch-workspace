import { writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { createJiraClient } from '../../clients/jira.js'
import { loadCredentials } from '../../credentials.js'
import { HedyError, toHedyError } from '../../errors.js'
import { runAction } from '../../run-action.js'
import { parseJsonText, readTextFile } from './files.js'
import { issueKeySchema } from './issue-key.js'
import { loadManifest } from './manifest.js'
import { buildCreatePlan, planIdSchema, refuseStalePlan, renderPlan, renderWriteOutcome } from './plan.js'

export const RECEIPT_FILENAME = 'ticket.created.json'

const createOptionsSchema = z.object({
  from: z.string().min(1, '--from is empty. Give --from the path of a ticket manifest, then run the command again.'),
  confirm: planIdSchema.optional()
})

const RECEIPT_NEXT_STEP = 'Check in Jira whether the manifest\'s issue exists, then fix or delete the receipt and run the command again.'

const receiptSchema = z.object({
  key: issueKeySchema,
  url: z.string().min(1),
  planId: planIdSchema,
  createdAt: z.string().min(1)
})

const validateReceipt = (value, path) => {
  const result = receiptSchema.safeParse(value)
  if (result.success) return result.data
  throw new HedyError('USAGE', `The receipt at ${path} does not hold key, url, planId and createdAt. ${RECEIPT_NEXT_STEP}`, { cause: result.error })
}

const readReceipt = async (path) => {
  const text = await readTextFile(path, { kind: 'receipt', missing: () => undefined })
  if (text === undefined) return undefined
  return validateReceipt(parseJsonText(text, { kind: 'receipt', path, nextStep: RECEIPT_NEXT_STEP }), path)
}

const writeReceipt = async (path, receipt) => {
  try {
    await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`)
  } catch (error) {
    throw new HedyError(
      'UNKNOWN',
      `Jira created ${receipt.key} at ${receipt.url}, but the receipt could not be written at ${path}. Write this receipt into that file before running the command again: ${JSON.stringify(receipt)}`,
      { cause: error }
    )
  }
}

const readBackCreatedIssue = async (client, { key, url, receiptPath }) => {
  try {
    await client.issue(key)
  } catch (error) {
    const readBackError = toHedyError(error)
    throw new HedyError(
      readBackError.code,
      `Jira created ${key} at ${url} and the receipt is at ${receiptPath}, but reading the issue back failed: ${readBackError.message} Run the same confirm again to read the issue back.`,
      { cause: readBackError }
    )
  }
}

const dryRunResult = ({ fields, ...plan }) => ({ mode: 'dry-run', ...plan })

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
  await readBackCreatedIssue(client, { key, url, receiptPath })
  return { mode: 'created', key, url }
}

/**
 * Without confirm, resolves to the dry run of the manifest at from, resolved
 * against the current folder, and reads no credentials. With confirm, a
 * receipt beside the manifest whose planId is confirm resolves to unchanged
 * after reading the issue back; a receipt that is not JSON or does not hold
 * key, url, planId and createdAt, a receipt with another planId, or a
 * confirm that is not the plan's id, rejects with USAGE before any request.
 * Else the issue is created, the receipt written at once, the issue read
 * back, and the result is created. A failed read back rejects with the read
 * back's code, naming the key and the receipt path.
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
