// Round 2 of hedy prose check: runs the check over the estate and prints the
// counts per row and per pattern as markdown. Run from the workspace root:
//   node .claude/workareas/technical-authoring/round-2-counts.mjs <docs repo> > <report part>
// The docs repo argument is the folder that holds the docs repo's docs/ folder.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const DOCS_REPO = resolve(process.argv[2])
const CLI = 'hedy/src/cli.js'
const { readLanguageRows } = await import(pathToFileURL(resolve('hedy/src/commands/prose/language-file.js')))
const rows = await readLanguageRows(resolve('.'))

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...options })
  if (result.status !== 0 && result.status !== 1) throw new Error(`${command} ${args.join(' ')} exited ${result.status}: ${result.stderr}`)
  return result.stdout
}

const checkFindings = (args, input) => {
  const envelope = JSON.parse(run('node', [CLI, 'prose', 'check', '--json', ...args], { input }))
  if (envelope.result === null) throw new Error(JSON.stringify(envelope.errors))
  return envelope.result.findings
}

const EXCLUDED = /__fixtures__\/|prose-gate-cases\/|\/tests\/expected\//
const repoFiles = run('git', ['ls-files', '*.md']).split('\n').filter((path) => path !== '' && !EXCLUDED.test(path))

const markdownUnder = (folder) => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
  const path = join(folder, entry.name)
  if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : markdownUnder(path)
  return entry.name.endsWith('.md') ? [path] : []
})
const docsFiles = markdownUnder(join(DOCS_REPO, 'docs'))

const commits = run('git', ['log', '-50', '--format=%h', 'origin/main']).split('\n').filter(Boolean)

const inChunks = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))

const corpus = [
  { name: 'This repo, tracked markdown', count: repoFiles.length, findings: inChunks(repoFiles, 100).flatMap((chunk) => checkFindings(chunk)) },
  {
    name: 'Docs repo, markdown under docs/',
    count: docsFiles.length,
    findings: inChunks(docsFiles, 100).flatMap((chunk) => checkFindings(chunk)).map((finding) => ({ ...finding, label: `docs-repo/${relative(DOCS_REPO, finding.label)}` }))
  },
  {
    name: 'Last 50 commit messages on main',
    count: commits.length,
    findings: commits.flatMap((hash) => checkFindings(['--stdin', '--label', `commit ${hash}`], run('git', ['log', '-1', '--format=%B', hash])))
  }
]

const all = corpus.flatMap(({ findings }) => findings)
const countKind = (findings, kind) => findings.filter((finding) => finding.kind === kind).length
const cell = (text) => text.replace(/\|/g, '\\|').replace(/`/g, "'")
const clip = (text, length) => (text.length > length ? `${text.slice(0, length)}...` : text)
const rowLabel = (forms) => clip(forms.slice(0, 3).map((form) => `\`${form}\``).join(', ') + (forms.length > 3 ? ` and ${forms.length - 3} more` : ''), 90)

const tally = (values) => [...values.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map())]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

const topLines = (findings) => tally(findings.map(({ text }) => text.trim())).slice(0, 10).map(([text, count]) => {
  const first = findings.find((finding) => finding.text.trim() === text)
  return `- ${count > 1 ? `${count} times, first at ` : ''}\`${first.label}:${first.line}\`: ${cell(clip(text, 160))}`
})

const corpusTable = () => [
  '| Corpus | Files or messages | Banned | Examine | Pattern |',
  '| --- | --- | --- | --- | --- |',
  ...corpus.map(({ name, count, findings }) => `| ${name} | ${count} | ${countKind(findings, 'banned')} | ${countKind(findings, 'examine')} | ${countKind(findings, 'pattern')} |`)
]

const rowSection = (kind, title, tableRows) => {
  const entries = tableRows.map((row) => ({ row, findings: all.filter((finding) => finding.kind === kind && finding.repair === row.repair) }))
    .sort((a, b) => b.findings.length - a.findings.length)
  const byCorpus = (findings) => corpus.map(({ findings: corpusFindings }) => findings.filter((finding) => corpusFindings.includes(finding)).length).join(' / ')
  return [
    `## ${title}`,
    '',
    '| Row | Findings (repo / docs / commits) | Files | Matched terms |',
    '| --- | --- | --- | --- |',
    ...entries.map(({ row, findings }) => `| ${rowLabel(row.forms)} | ${findings.length} (${byCorpus(findings)}) | ${new Set(findings.map(({ label }) => label)).size} | ${cell(clip(tally(findings.flatMap(({ term }) => term.split(', '))).map(([term, count]) => `${term} ${count}`).join(', '), 120))} |`),
    '',
    ...entries.filter(({ findings }) => findings.length > 0).flatMap(({ row, findings }) => [`### ${rowLabel(row.forms)}`, '', ...topLines(findings), ''])
  ]
}

const patternSection = () => {
  const names = ['em dash', 'spaced en dash', 'curly quote', 'N/A', 'trailing it']
  const entries = names.map((name) => ({ name, findings: all.filter((finding) => finding.kind === 'pattern' && finding.term === name) }))
  return [
    '## Patterns',
    '',
    '| Pattern | Findings | Files |',
    '| --- | --- | --- |',
    ...entries.map(({ name, findings }) => `| ${name} | ${findings.length} | ${new Set(findings.map(({ label }) => label)).size} |`),
    '',
    ...entries.filter(({ findings }) => findings.length > 0).flatMap(({ name, findings }) => [`### ${name}`, '', ...topLines(findings), ''])
  ]
}

process.stdout.write([
  ...corpusTable(),
  '',
  ...rowSection('banned', 'Banned Words and Phrases', rows.banned),
  ...rowSection('examine', 'Words to Examine', rows.examine),
  ...patternSection()
].join('\n') + '\n')
