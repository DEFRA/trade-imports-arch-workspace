import { z } from 'zod'
import { HedyError } from '../../errors.js'
import { runAction } from '../../run-action.js'
import { readFileText } from '../prose/check.js'
import { diagramsInText, fileLineOf } from './mermaid-diagrams.js'
import { mermaidFiles } from './mermaid-files.js'
import { parseDiagrams } from './mermaid-parser.js'

const checkInputSchema = z.object({
  paths: z.array(z.string().min(1, 'A path is empty. Give the path of each file to check, then run the command again.'))
})

const withFileLine = (verdict, diagram) =>
  verdict.ok ? verdict : { label: verdict.label, ok: false, line: fileLineOf(diagram, verdict.message), message: verdict.message }

const failureMessage = (failed) =>
  `The check found ${failed} ${failed === 1 ? 'diagram' : 'diagrams'} that Mermaid rejects. Fix each line the result names, then run the check again.`

const checkResult = ({ fileCount, diagrams, verdicts }) => ({
  passed: verdicts.every(({ ok }) => ok),
  files: fileCount,
  diagrams: verdicts.map((verdict, i) => withFileLine(verdict, diagrams[i]))
})

const failedCount = ({ diagrams }) => diagrams.filter(({ ok }) => !ok).length

const counted = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

const failLines = ({ label, line, message }) => {
  const where = line === undefined ? label : `${label}  line ${line}`
  return [`FAIL  ${where}`, ...message.trimEnd().split('\n').map((text) => `      ${text}`)]
}

const verdictLines = (verdict) => verdict.ok ? [`PASS  ${verdict.label}  ${verdict.type}`] : failLines(verdict)

const summaryLine = (result) => {
  const failed = failedCount(result)
  return `${counted(result.diagrams.length, 'diagram')} in ${counted(result.files, 'file')}: ${result.diagrams.length - failed} passed, ${failed} failed.`
}

export const renderCheck = (result) => result.diagrams.length === 0
  ? `No Mermaid diagrams found in ${counted(result.files, 'file')}.`
  : [...result.diagrams.flatMap(verdictLines), '', summaryLine(result)].join('\n')

const runCheck = async ({ paths }, { workspaceRoot }) => {
  const files = await Promise.all((await mermaidFiles(paths)).map(readFileText))
  const diagrams = files.flatMap(({ label, text }) => diagramsInText({ path: label, text }))
  const verdicts = await parseDiagrams(diagrams, { workspaceRoot: workspaceRoot() })
  const result = checkResult({ fileCount: files.length, diagrams, verdicts })
  if (!result.passed) throw new HedyError('PARSE', failureMessage(failedCount(result)), { result })
  return result
}

export const register = (group, { stdout, stderr, setExitCode, workspaceRoot }) => {
  group
    .command('check')
    .description('Check that Mermaid diagrams parse')
    .argument('[paths...]', 'The .mmd files, Markdown pages and folders to check')
    .action((paths, options, command) => runAction(
      () => runCheck(checkInputSchema.parse({ paths }), { workspaceRoot }),
      { json: command.optsWithGlobals().json === true, render: renderCheck, stdout, stderr, setExitCode }
    ))
}
