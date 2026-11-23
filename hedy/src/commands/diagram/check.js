import { z } from 'zod'
import { HedyError } from '../../errors.js'
import { runAction } from '../../run-action.js'
import { readFileText, readStdinText } from '../prose/check.js'
import { diagramsInText, fileLineOf } from './mermaid-diagrams.js'
import { mermaidFiles } from './mermaid-files.js'
import { parseDiagrams } from './mermaid-parser.js'

const INPUT_RULES = [
  {
    breaks: ({ stdin, paths }) => stdin === true && paths.length > 0,
    message: 'The check reads either paths or --stdin, not both. Run the command again with one of them.'
  },
  {
    breaks: ({ stdin, label }) => stdin === true && !label?.trim(),
    message: '--stdin needs a non-empty --label <name>, the name the result gives the diagram. Run the command again with --label.'
  },
  {
    breaks: ({ stdin, label }) => stdin !== true && label !== undefined,
    message: '--label applies only to a diagram read from --stdin, because a file\'s diagrams take their path. Run the command again with --stdin, or without --label.'
  },
  {
    breaks: ({ stdin, paths }) => stdin !== true && paths.length === 0,
    message: 'No diagram was given to check. Give one or more paths, or --stdin with --label <name>, then run the command again.'
  }
]

const inputProblem = (input) => INPUT_RULES.find(({ breaks }) => breaks(input))?.message

const checkInputSchema = z.object({
  paths: z.array(z.string().min(1, 'A path is empty. Give the path of each file to check, then run the command again.')),
  stdin: z.boolean().optional(),
  label: z.string().optional()
}).superRefine((input, context) => {
  const problem = inputProblem(input)
  if (problem !== undefined) context.addIssue({ code: 'custom', message: problem })
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

const CHECK_HELP = `
Each diagram is parsed by the Mermaid that delivery-info-arch-tooling installs, the version the docs pipeline renders with.
  hedy diagram check flow.mmd                          one Mermaid file
  hedy diagram check docs/page.md                      every mermaid block on a Markdown page
  hedy diagram check docs/                             every .mmd file and page beneath a folder,
                                                       leaving out node_modules, build, generated and dot folders
  hedy diagram check --stdin --label "draft: sign-in"  one diagram held in context, read from stdin
The result gives each diagram's verdict. A failure gives the line of the file and Mermaid's message.
Exit 0: every diagram parses. Exit 1: a diagram does not parse, or Mermaid is not installed (run make install). Exit 2: a usage error.`

const stdinSources = async ({ label }, stdin) => {
  const { text } = await readStdinText(stdin, { label })
  return { fileCount: 1, diagrams: [{ label, path: label, text, linesBefore: 0 }] }
}

const fileSources = async ({ paths }) => {
  const files = await Promise.all((await mermaidFiles(paths)).map(readFileText))
  return { fileCount: files.length, diagrams: files.flatMap(({ label, text }) => diagramsInText({ path: label, text })) }
}

const runCheck = async (input, { stdin, workspaceRoot }) => {
  const { fileCount, diagrams } = input.stdin ? await stdinSources(input, stdin) : await fileSources(input)
  const verdicts = await parseDiagrams(diagrams, { workspaceRoot: workspaceRoot() })
  const result = checkResult({ fileCount, diagrams, verdicts })
  if (!result.passed) throw new HedyError('PARSE', failureMessage(failedCount(result)), { result })
  return result
}

export const register = (group, { stdout, stderr, stdin, setExitCode, workspaceRoot }) => {
  group
    .command('check')
    .description('Check that Mermaid diagrams parse')
    .argument('[paths...]', 'The .mmd files, Markdown pages and folders to check')
    .option('--stdin', 'Read one diagram from stdin')
    .option('--label <name>', 'The name the result gives the diagram read from stdin')
    .addHelpText('after', CHECK_HELP)
    .action((paths, options, command) => runAction(
      () => runCheck(checkInputSchema.parse({ paths, stdin: options.stdin, label: options.label }), { stdin, workspaceRoot }),
      { json: command.optsWithGlobals().json === true, render: renderCheck, stdout, stderr, setExitCode }
    ))
}
