import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HedyError } from '../../errors.js'
import { runLocalTool } from '../../local-tool.js'

const WORKER = fileURLToPath(new URL('./mermaid-worker.js', import.meta.url))

const mermaidEntry = (workspaceRoot) => {
  const tooling = resolve(workspaceRoot, 'delivery-info-arch-tooling')
  try {
    return createRequire(join(tooling, 'package.json')).resolve('mermaid')
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error
    throw new HedyError('SETUP', `Mermaid is not installed in ${tooling}. Run make install in the workspace, then run the command again.`, { cause: error })
  }
}

const errorLineIn = (stderr) => stderr.match(/^\w*Error\b.*$/m)?.[0] ?? stderr.trim().split('\n')[0]

const parsedOutput = (stdout) => {
  try {
    return JSON.parse(stdout)
  } catch (error) {
    throw new HedyError('UNKNOWN', 'The Mermaid parser gave output that is not its verdicts. This is a fault in hedy: report the files you checked, then run the check again.', { cause: error })
  }
}

const verdictsFrom = ({ exitCode, stdout, stderr, timedOut }, { entry, timeoutMs }) => {
  if (timedOut) {
    throw new HedyError('UNKNOWN', `The Mermaid parser did not finish within ${timeoutMs} ms, so hedy stopped it. Check fewer files at once, then run the check again.`)
  }
  if (exitCode !== 0) {
    throw new HedyError('SETUP', `The Mermaid at ${entry} could not run: ${errorLineIn(stderr)}. Run make install in the workspace, then run the command again.`)
  }
  return parsedOutput(stdout)
}

/**
 * Resolves to one verdict per diagram from the Mermaid that the workspace's
 * delivery-info-arch-tooling installs, parsed in a child process. Rejects
 * with SETUP when Mermaid is not installed or cannot run, and with UNKNOWN
 * when the parser runs past timeoutMs or its output is not its verdicts.
 *
 * @param {{ label: string, text: string }[]} diagrams
 * @param {{ workspaceRoot: string, timeoutMs?: number }} options
 */
export const parseDiagrams = async (diagrams, { workspaceRoot, timeoutMs = 120_000 }) => {
  const entry = mermaidEntry(workspaceRoot)
  const run = await runLocalTool({
    command: process.execPath,
    args: [WORKER, entry],
    env: {},
    input: JSON.stringify(diagrams.map(({ label, text }) => ({ label, text }))),
    timeoutMs
  })
  return verdictsFrom(run, { entry, timeoutMs })
}
