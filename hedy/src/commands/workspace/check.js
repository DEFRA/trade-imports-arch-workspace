import { realpath } from 'node:fs/promises'
import { homedir as osHomedir } from 'node:os'
import { z } from 'zod'
import { HedyError, toHedyError } from '../../errors.js'
import { runLocalTool } from '../../local-tool.js'
import { runAction } from '../../run-action.js'
import { SETUP_CHECKS } from './setup-checks.js'

const checkOptionsSchema = z.object({}).strict()

const failedCheckError = (name, reason) => new HedyError('SETUP', `${name}: ${toHedyError(reason).message}`, { cause: reason })

/**
 * Runs every setup check against the workspace's real root and resolves to
 * { root, checks }, one { name, detail } per check in order, when every check
 * passes. Otherwise rejects with an AggregateError holding one SETUP error per
 * failed check, in check order, its message led by the check's name.
 *
 * @param {{
 *   workspaceRoot: () => string, env: Record<string, string | undefined>,
 *   cwd?: string, homedir?: string, nodeVersion?: string,
 *   runTool?: typeof runLocalTool, checks?: typeof SETUP_CHECKS
 * }} options
 * @returns {Promise<{ root: string, checks: { name: string, detail: string }[] }>}
 */
export const runWorkspaceCheck = async ({
  workspaceRoot,
  env,
  cwd = process.cwd(),
  homedir = osHomedir(),
  nodeVersion = process.versions.node,
  runTool = runLocalTool,
  checks = SETUP_CHECKS
}) => {
  const root = await realpath(workspaceRoot())
  const context = { root, env, cwd, homedir, nodeVersion, runTool }
  const outcomes = await Promise.allSettled(checks.map(({ run }) => run(context)))
  const failures = outcomes.flatMap((outcome, index) => outcome.status === 'rejected' ? [failedCheckError(checks[index].name, outcome.reason)] : [])
  if (failures.length > 0) throw new AggregateError(failures, 'The workspace setup check failed')
  return { root, checks: checks.map(({ name }, index) => ({ name, detail: outcomes[index].value })) }
}

/**
 * Returns one [name, detail] row per check, in order.
 *
 * @param {{ checks: { name: string, detail: string }[] }} result
 * @returns {[string, string][]}
 */
export const checkRows = ({ checks }) => checks.map(({ name, detail }) => [name, detail])

const renderCheck = (result) => checkRows(result).map(([name, detail]) => `ok ${name}: ${detail}`).join('\n')

export const register = (group, { stdout, stderr, setExitCode, env, workspaceRoot }) => {
  group
    .command('check')
    .description('Check that this machine and checkout match the expected workspace setup')
    .action((options, command) => runAction(() => {
      checkOptionsSchema.parse(options)
      return runWorkspaceCheck({ workspaceRoot, env })
    }, {
      json: command.optsWithGlobals().json === true,
      render: renderCheck,
      stdout,
      stderr,
      setExitCode
    }))
}
