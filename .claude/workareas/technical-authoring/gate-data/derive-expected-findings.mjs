// One-off: derives the expected findings of the hedy prose check fixtures
// from the old check-prose.sh golden outputs. Prints the JSON on stdout and
// the review notes on stderr. Run from the workspace root:
//   node .claude/workareas/technical-authoring/gate-data/derive-expected-findings.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

const CASES = '.claude/workareas/technical-authoring/gate-data/prose-gate-cases'
const LANGUAGE = '.claude/skills/authoring/references/language.md'
const notes = []
const note = (text) => notes.push(text)

const LANG_SOURCE = 'best-practices/writing/language.md'

const DEFERRED_SHAPES = [
  [/^FAQ voice in a heading/, 'faq heading'],
  [/^FAQ voice in a label/, 'faq label'],
  [/^WARN hits are FAQ voice/, 'faq opener'],
  [/^WARN hits are table headers that trail off/, 'header preposition'],
  [/^WARN hits are headings not in title case/, 'heading case'],
  [/^WARN hits are an inventory opener/, 'inventory opener'],
  [/^WARN hits are the contact-clause pattern/, 'contact clause'],
  [/^WARN hits are aside stacking/, 'aside stacking'],
  [/^WARN hits are a spaced hyphen as a sentence break/, 'spaced hyphen'],
  [/^WARN hits are a semicolon in body text/, 'semicolon']
]

const collapse = (text) => text.toLowerCase().replace(/\s+/g, ' ')

const quotedTerms = (message) => {
  const prefix = message.split(' - ')[0]
  return [...prefix.matchAll(/"([^"]+)"/g)].map(([, term]) => term)
}

const punctuationShapes = (text) => [
  ...(text.includes('—') ? ['em dash'] : []),
  ...(/\s–\s/.test(text) ? ['spaced en dash'] : []),
  ...(/[‘’“”]/.test(text) ? ['curly quote'] : [])
]

const classify = (message) => {
  if (message.startsWith('banned punctuation')) return { kind: 'pattern', punctuation: true }
  if (message.startsWith('"N/A"')) return { kind: 'pattern', terms: ['N/A'] }
  if (message.startsWith('sentence ends on the pronoun')) return { kind: 'pattern', terms: ['trailing it'] }
  if (message.startsWith('lowercase generic "portal"')) return { kind: 'banned', terms: ['portal'] }
  const deferred = DEFERRED_SHAPES.find(([pattern]) => pattern.test(message))
  if (deferred) return { kind: 'deferred', terms: [deferred[1]] }
  const fromLanguage = message.includes(LANG_SOURCE)
  if (message.startsWith('banned term ')) {
    return fromLanguage ? { kind: 'banned', terms: quotedTerms(message.slice('banned term '.length)) } : { kind: 'other-source' }
  }
  if (message.startsWith('WARN hits are "')) {
    return fromLanguage ? { kind: 'examine', terms: quotedTerms(message.slice('WARN hits are '.length)) } : { kind: 'other-source' }
  }
  return { kind: 'unknown' }
}

const deriveFindings = (expectedFile) => {
  const findings = []
  const deferred = []
  let pending = []
  for (const raw of readFileSync(join(CASES, 'expected', expectedFile), 'utf8').split('\n')) {
    const hit = raw.match(/^check-prose: (FAIL|WARN) (.+?):(\d+): (.*)$/)
    if (hit) {
      pending.push({ tier: hit[1], line: Number(hit[3]), text: hit[4] })
      continue
    }
    if (!raw.startsWith('check-prose: ')) continue
    const message = raw.slice('check-prose: '.length)
    const { kind, terms, punctuation } = classify(message)
    if (kind === 'unknown') note(`${expectedFile}: unclassified message: ${message.slice(0, 80)}`)
    for (const { tier, line, text } of pending) {
      if (kind === 'other-source' || kind === 'unknown') continue
      const expectedTier = { banned: 'FAIL', examine: 'WARN' }[kind]
      if (expectedTier && tier !== expectedTier) note(`${expectedFile}:${line}: old tier ${tier} disagrees with table ${kind}`)
      if (kind === 'deferred') {
        deferred.push({ line, kind: 'pattern', term: terms[0] })
      } else if (punctuation) {
        for (const term of punctuationShapes(text)) findings.push({ line, kind, term })
      } else if (kind === 'pattern') {
        findings.push({ line, kind, term: terms[0] })
      } else {
        const onLine = terms.filter((term) => collapse(text).includes(collapse(term)))
        if (onLine.length === 0) note(`${expectedFile}:${line}: none of ${terms.join(', ')} found on the line`)
        findings.push({ line, kind, term: onLine.join(', ') })
      }
    }
    pending = []
  }
  if (pending.length > 0) note(`${expectedFile}: hit lines with no message after them`)
  const order = (a, b) => a.line - b.line || a.kind.localeCompare(b.kind) || a.term.localeCompare(b.term)
  return { findings: findings.sort(order), deferred: deferred.sort(order) }
}

const pageCases = readdirSync(join(CASES, 'fixtures'))
  .filter((name) => name.endsWith('.md'))
  .map((name) => basename(name, '.md'))
  .map((name) => ({ case: name, input: `pages/${name}.md`, label: `pages/${name}.md`, ...deriveFindings(`${name}.txt`) }))

const stdinCases = [
  { case: 'stdin-title-viol', input: 'stdin/stdin-title-viol.txt', label: 'title', ...deriveFindings('stdin-title-viol.txt') },
  { case: 'stdin-title-clean', input: 'stdin/stdin-title-clean.txt', label: 'title', ...deriveFindings('stdin-title-clean.txt') },
  {
    case: 'stdin-print-fail-lines',
    input: 'stdin/stdin-print-fail-lines.txt',
    label: 'plines',
    findings: [
      { line: 1, kind: 'banned', term: 'seamless' },
      { line: 1, kind: 'pattern', term: 'em dash' },
      { line: 3, kind: 'banned', term: 'portal' }
    ],
    deferred: []
  }
]
note('stdin-print-fail-lines: findings written by hand, because the old output printed only the failing lines')

const scopeCases = [
  ['scope-docs-page', 'docs/page.md'],
  ['scope-docs-agent-skill', '.claude/skills/x/SKILL.md'],
  ['scope-docs-agent-claude-md', 'hedy/CLAUDE.md']
].map(([name, label]) => ({ case: name, input: 'pages/scope-docs.md', label, ...deriveFindings(`${name}.txt`) }))

const cases = [...pageCases, ...stdinCases, ...scopeCases]

const languageRows = () => {
  const rows = []
  let section
  for (const line of readFileSync(LANGUAGE, 'utf8').split('\n')) {
    if (line.startsWith('## ')) section = line.slice(3)
    if (!['Banned Words and Phrases', 'Words to Examine'].includes(section)) continue
    if (!line.startsWith('| `')) continue
    const term = line.split(' | ')[0]
    const forms = [...term.matchAll(/`([^`]+)`/g)].map(([, form]) => form)
    const pattern = forms
      .map((form) => form.replace(/[.?+^$(){}[\]\\|]/g, '\\$&').replace(/\*$/, '[A-Za-z0-9-]*').replace(/ /g, '\\s+'))
      .join('|')
    rows.push({ kind: section.startsWith('Banned') ? 'banned' : 'examine', forms, regex: new RegExp(`\\b(?:${pattern})\\b`, 'gi') })
  }
  return rows
}

const roughMask = (text) => {
  let fenced = false
  return text.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return '' }
    if (fenced || /^\s*>/.test(line)) return ''
    return line.replace(/``.*?``/g, '').replace(/`[^`]*`/g, '').replace(/https?:\/\/\S+/g, '')
  })
}

const rows = languageRows()
for (const entry of cases) {
  const source = entry.input.startsWith('stdin/')
    ? join(CASES, entry.input)
    : entry.case.startsWith('scope-') ? join(CASES, 'fixtures/scope-docs/page.md') : join(CASES, 'fixtures', `${entry.case}.md`)
  roughMask(readFileSync(source, 'utf8')).forEach((text, index) => {
    for (const row of rows) {
      const matches = [...text.matchAll(row.regex)].map(([match]) => collapse(match))
      if (matches.length === 0) continue
      const known = entry.findings.some((finding) => finding.line === index + 1 && finding.kind === row.kind && matches.some((match) => finding.term.split(', ').includes(match)))
      if (!known) note(`${entry.case}:${index + 1}: rough check finds ${row.kind} ${[...new Set(matches)].join(', ')} not in the old output`)
    }
  })
}

process.stdout.write(`${JSON.stringify({ cases }, null, 2)}\n`)
process.stderr.write(`${notes.join('\n')}\n`)
