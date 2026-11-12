import { stat } from 'node:fs/promises'
import { z } from 'zod'
import { HedyError } from '../../errors.js'
import { runAction } from '../../run-action.js'
import { readTextFile } from '../jira/files.js'
import { LANGUAGE_FILE, readLanguageRows } from './language-file.js'
import { maskText } from './masking.js'

const formPattern = (form) => {
  const anyEnding = form.endsWith('*')
  const words = (anyEnding ? form.slice(0, -1) : form).split(' ').map((word) => RegExp.escape(word))
  return `${words.join('\\s+')}${anyEnding ? '[A-Za-z0-9-]*' : ''}`
}

const matchedTerm = (line, regex) => {
  const matches = [...line.matchAll(regex)].map(([text]) => text.toLowerCase().replace(/\s+/g, ' '))
  return matches.length === 0 ? undefined : [...new Set(matches)].join(', ')
}

const longestFirst = (forms) => [...forms].sort((a, b) => b.length - a.length)

const wordRule = (kind) => ({ forms, repair, scope, caseSensitive }) => {
  const regex = new RegExp(`\\b(?:${longestFirst(forms).map(formPattern).join('|')})\\b`, caseSensitive ? 'g' : 'gi')
  return { kind, repair, scope, termIn: (line) => matchedTerm(line, regex) }
}

const patternRepair = (patternRows, { name, rowStart }) => {
  const row = patternRows.find(({ description }) => description.startsWith(rowStart))
  if (row === undefined) {
    throw new HedyError('PARSE', `The Patterns table in the language file ${LANGUAGE_FILE} has no row that starts "${rowStart}", the row the ${name} pattern reports. Restore the row, then run the command again.`)
  }
  return row.repair
}

const patternRule = (patternRows) => (pattern) => ({
  kind: 'pattern',
  repair: patternRepair(patternRows, pattern),
  scope: 'all',
  termIn: (line) => (pattern.regex.test(line) ? pattern.name : undefined)
})

const patternRules = (patternRows) => [
  { name: 'em dash', regex: /\u2014/, rowStart: 'An em dash' },
  { name: 'spaced en dash', regex: /\s\u2013\s/, rowStart: 'An em dash' },
  { name: 'curly quote', regex: /[\u2018\u2019\u201C\u201D]/, rowStart: 'A curly quote' },
  { name: 'N/A', regex: /\bn\/a\b/i, rowStart: '`N/A`' },
  { name: 'trailing it', regex: /\sit\s*([.!?]|$)/, rowStart: 'A sentence or line that ends on the pronoun' }
].map(patternRule(patternRows))

const rulesOf = ({ banned, examine, patterns }) => [
  ...banned.map(wordRule('banned')),
  ...examine.map(wordRule('examine')),
  ...patternRules(patterns)
]

const pathInsideWorktree = (label) => label.replace(/^(?:.*\/)?\.claude\/worktrees\/[^/]+\//, '')

const isAgentInstructionFile = (label) => {
  const path = pathInsideWorktree(label)
  return path.startsWith('.claude/') || path.includes('/.claude/') || ['CLAUDE.md', 'AGENTS.md'].includes(path.split('/').at(-1))
}

const rulesForLabel = (rules, label) =>
  isAgentInstructionFile(label) ? rules.filter(({ scope }) => scope !== 'documents') : rules

const findingsOnLine = (rules, { label, line, maskedLine, text }) => rules.flatMap(({ kind, repair, termIn }) => {
  const term = termIn(maskedLine)
  return term === undefined ? [] : [{ label, line, kind, term, text, repair }]
})

const findingsInText = (rules, { label, text }) => {
  const labelRules = rulesForLabel(rules, label)
  const lines = text.split(/\r?\n/)
  return maskText(text).split('\n').flatMap((maskedLine, index) =>
    findingsOnLine(labelRules, { label, line: index + 1, maskedLine, text: lines[index] }))
}

const isFailingFinding = ({ kind }) => kind !== 'examine'

/**
 * Returns the findings of every text against the rows, line by line, with
 * passed false when any banned or pattern finding exists. Each line is matched
 * after maskText, and a finding holds the line as written. Throws PARSE when
 * the pattern rows lack a row that a pattern held in code reports.
 *
 * @param {{
 *   texts: { label: string, text: string }[],
 *   rows: Awaited<ReturnType<typeof readLanguageRows>>
 * }} options
 * @returns {{
 *   passed: boolean,
 *   findings: { label: string, line: number, kind: 'banned' | 'examine' | 'pattern', term: string, text: string, repair: string }[]
 * }}
 */
export const runProseCheck = ({ texts, rows }) => {
  const rules = rulesOf(rows)
  const findings = texts.flatMap((text) => findingsInText(rules, text))
  return { passed: !findings.some(isFailingFinding), findings }
}

const countsOf = (findings) => {
  const countOf = (kind) => findings.filter((finding) => finding.kind === kind).length
  return { banned: countOf('banned'), examine: countOf('examine'), pattern: countOf('pattern') }
}

const findingLines = ({ label, line, kind, term, text, repair }) => `${label}:${line}: ${kind} "${term}": ${repair}\n  ${text}`

const summaryLine = ({ passed, findings }) => {
  const { banned, examine, pattern } = countsOf(findings)
  if (!passed) return `${banned} banned, ${examine} examine, ${pattern} pattern`
  return examine === 0 ? 'passed' : `passed with ${examine} examine`
}

export const renderProseCheck = (result) => [...result.findings.map(findingLines), summaryLine(result)].join('\n')

const missingFile = (path) => new HedyError('USAGE', `No file exists at ${path}. Check the path, then run the command again.`)

const statError = (path, error) => ['ENOENT', 'ENOTDIR'].includes(error.code)
  ? missingFile(path)
  : new HedyError('UNKNOWN', `The path ${path} could not be read. Check that the path is a regular file with read permission, then run the command again.`, { cause: error })

const checkRegularFile = async (path) => {
  const status = await stat(path).catch((error) => { throw statError(path, error) })
  if (!status.isFile()) {
    throw new HedyError('USAGE', `The path ${path} is not a regular file. Give the path of a file to check, then run the command again.`)
  }
}

/**
 * Resolves to the text of the file at path, labelled with the path as given.
 * A missing path or a path that is not a regular file rejects with USAGE
 * naming the path, and a secrets file rejects with USAGE through readTextFile.
 *
 * @param {string} path
 * @returns {Promise<{ label: string, text: string }>}
 */
export const readFileText = async (path) => {
  await checkRegularFile(path)
  const text = await readTextFile(path, { kind: 'file', missing: () => { throw missingFile(path) } })
  return { label: path, text }
}

/**
 * Resolves to the whole of the stream, read as UTF-8, under label.
 *
 * @param {AsyncIterable<string | Uint8Array>} stream
 * @param {{ label: string }} options
 * @returns {Promise<{ label: string, text: string }>}
 */
export const readStdinText = async (stream, { label }) => {
  const chunks = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return { label, text: Buffer.concat(chunks).toString('utf8') }
}

const inputProblem = ({ files, stdin, label }) => {
  if (stdin && files.length > 0) return 'The check reads either file paths or --stdin, not both. Run the command again with one of them.'
  if (stdin && !label?.trim()) return '--stdin needs a non-empty --label <name>, the name each finding gives the text. Run the command again with --label.'
  if (!stdin && label !== undefined) return '--label applies only to text read from --stdin, because a file finding gives its path. Run the command again with --stdin, or without --label.'
  if (!stdin && files.length === 0) return 'No text was given to check. Give one or more file paths, or --stdin with --label <name>, then run the command again.'
  return undefined
}

const checkInputSchema = z.object({
  files: z.array(z.string().min(1, 'A file path is empty. Give the path of each file to check, then run the command again.')),
  stdin: z.boolean().optional(),
  label: z.string().optional()
}).superRefine((input, context) => {
  const problem = inputProblem(input)
  if (problem !== undefined) context.addIssue({ code: 'custom', message: problem })
})

const readTexts = async (input, { stdin }) =>
  input.stdin ? [await readStdinText(stdin, { label: input.label })] : Promise.all(input.files.map(readFileText))

const failureMessage = (findings) => {
  const { banned, examine, pattern } = countsOf(findings)
  return `The check found ${banned} banned, ${examine} examine and ${pattern} pattern findings. Reword each banned and pattern finding, then run the check again.`
}

const runCheck = async (input, { stdin, workspaceRoot }) => {
  const rows = await readLanguageRows(workspaceRoot())
  const result = runProseCheck({ texts: await readTexts(input, { stdin }), rows })
  if (!result.passed) throw new HedyError('PROSE', failureMessage(result.findings), { result })
  return result
}

export const register = (group, { stdout, stderr, stdin, setExitCode, workspaceRoot }) => {
  group
    .command('check')
    .description('Check files, or text read from stdin, against the house language file')
    .argument('[files...]', 'The files to check')
    .option('--stdin', 'Read the text to check from stdin')
    .option('--label <name>', 'The name the findings give the text read from stdin')
    .action((files, options, command) => runAction(() => {
      const input = checkInputSchema.parse({ files, stdin: options.stdin, label: options.label })
      return runCheck(input, { stdin, workspaceRoot })
    }, {
      json: command.optsWithGlobals().json === true,
      render: renderProseCheck,
      stdout,
      stderr,
      setExitCode
    }))
}
