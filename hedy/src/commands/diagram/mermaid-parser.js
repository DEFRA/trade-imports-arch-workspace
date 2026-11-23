import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HedyError } from '../../errors.js'
import { faultContextOf } from '../../fault-context.js'
import { faultReport } from '../../fault-report.js'
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

const diagramFaultContext = (entry, input) => {
  const context = faultContextOf()
  const versions = {
    ...context.versions,
    mermaid: createRequire(entry)('mermaid/package.json').version,
    jsdom: createRequire(import.meta.url)('jsdom/package.json').version
  }
  return { ...context, versions, input }
}

const parsedOutput = (stdout, entry) => {
  try {
    return JSON.parse(stdout)
  } catch (error) {
    throw new HedyError('INTERNAL', 'The Mermaid parser gave output that is not its verdicts. This is a fault in hedy: file the report as a hedy bug.', {
      cause: error,
      report: faultReport(error, diagramFaultContext(entry))
    })
  }
}

const reportedVerdict = (verdict, { entry, text }) => {
  if (verdict.cause !== 'hedy') return verdict
  const { fault, ...rest } = verdict
  return { ...rest, message: `${fault.name}: ${fault.message}`, report: faultReport(fault, diagramFaultContext(entry, text)) }
}

const verdictsFrom = ({ exitCode, stdout, stderr, timedOut }, { entry, timeoutMs }) => {
  if (timedOut) {
    throw new HedyError('UNKNOWN', `The Mermaid parser did not finish within ${timeoutMs} ms, so hedy stopped it. Check fewer files at once, then run the check again.`)
  }
  if (exitCode !== 0) {
    throw new HedyError('SETUP', `The Mermaid at ${entry} could not run: ${errorLineIn(stderr)}. Run make install in the workspace, then run the command again.`)
  }
  return parsedOutput(stdout, entry)
}

/**
 * Resolves to one verdict per diagram from the Mermaid that the workspace's
 * delivery-info-arch-tooling installs, parsed in a child process that starts
 * when there is at least one diagram. A diagram hedy could not check holds
 * the message of the fault and its triage report, which names the Mermaid and
 * jsdom versions and holds the diagram. Rejects with SETUP when Mermaid is not
 * installed or cannot run, with UNKNOWN when the parser runs past timeoutMs,
 * and with INTERNAL when its output is not its verdicts.
 *
 * @param {{ label: string, text: string }[]} diagrams
 * @param {{ workspaceRoot: string, timeoutMs?: number }} options
 */
export const parseDiagrams = async (diagrams, { workspaceRoot, timeoutMs = 120_000 }) => {
  if (diagrams.length === 0) return []
  const entry = mermaidEntry(workspaceRoot)
  const run = await runLocalTool({
    command: process.execPath,
    args: [WORKER, entry],
    env: {},
    input: JSON.stringify(diagrams.map(({ label, text }) => ({ label, text }))),
    timeoutMs
  })
  return verdictsFrom(run, { entry, timeoutMs }).map((verdict, i) => reportedVerdict(verdict, { entry, text: diagrams[i].text }))
}
