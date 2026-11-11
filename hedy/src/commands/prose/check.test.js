import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { runCli } from '../../test-support/cli.js'
import { rejectionOf } from '../../test-support/http.js'
import { captureIo } from '../../test-support/io.js'
import { readFileText, readStdinText, register, renderProseCheck, runProseCheck } from './check.js'
import { LANGUAGE_FILE, readLanguageRows } from './language-file.js'

const WORKSPACE_ROOT = fileURLToPath(new URL('../../../../', import.meta.url))
const fixturePath = (name) => fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url))
const readFixture = (name) => readFile(fixturePath(name), 'utf8')

const EM_DASH = String.fromCodePoint(0x2014)
const EN_DASH = String.fromCodePoint(0x2013)
const RIGHT_SINGLE_QUOTE = String.fromCodePoint(0x2019)

const rows = await readLanguageRows(WORKSPACE_ROOT)
const { cases } = JSON.parse(await readFixture('expected-findings.json'))

const check = (text, { label = 'docs/page.md' } = {}) => runProseCheck({ texts: [{ label, text }], rows })

const byLineKindTerm = (a, b) => a.line - b.line || a.kind.localeCompare(b.kind) || a.term.localeCompare(b.term)
const lineKindTerms = (findings) => findings.map(({ line, kind, term }) => ({ line, kind, term })).sort(byLineKindTerm)

const bannedRepairOf = (form) => rows.banned.find(({ forms }) => forms.includes(form)).repair
const patternRepairOf = (rowStart) => rows.patterns.find(({ description }) => description.startsWith(rowStart)).repair

describe('runProseCheck on the fixture cases', () => {
  it.each(cases)('gives the $case case its expected line, kind and term findings, each under the case label with the line as written', async ({ input, label, findings }) => {
    const text = await readFixture(input)
    const result = runProseCheck({ texts: [{ label, text }], rows })
    expect(lineKindTerms(result.findings)).toEqual(lineKindTerms(findings))
    expect(result.passed).toBe(findings.every(({ kind }) => kind === 'examine'))
    const lines = text.split('\n')
    for (const finding of result.findings) {
      expect(finding.label).toBe(label)
      expect(finding.text).toBe(lines[finding.line - 1])
    }
  })
})

describe('runProseCheck', () => {
  it('passes a clean page with no findings', async () => {
    expect(check(await readFixture('pages/clean.md'))).toEqual({ passed: true, findings: [] })
  })

  it.each([
    ['.claude/skills/x/SKILL.md', 0],
    ['docs/.claude/x.md', 0],
    ['hedy/CLAUDE.md', 0],
    ['AGENTS.md', 0],
    ['/abs/workspace/.claude/rules/x.md', 0],
    ['docs/page.md', 1],
    ['docs/claude/CLAUDE.md.bak', 1],
    ['.claude/worktrees/w/docs/page.md', 1],
    ['/tmp/x/.claude/worktrees/w/docs/page.md', 1],
    ['.claude/worktrees/w/.claude/skills/x/SKILL.md', 0],
    ['.claude/worktrees/w/AGENTS.md', 0]
  ])('gives the text "You decide." labelled %s exactly %i banned findings', (label, count) => {
    const { findings } = check('You decide.\n', { label })
    expect(findings.filter(({ kind }) => kind === 'banned')).toHaveLength(count)
  })

  it('reports a lower-case portal as banned and passes the proper noun CDP Portal', () => {
    expect(lineKindTerms(check('Sign in to the portal.').findings)).toEqual([{ line: 1, kind: 'banned', term: 'portal' }])
    expect(check('CDP Portal holds the value.')).toEqual({ passed: true, findings: [] })
  })

  it('gives a banned finding its label, line, term, the line as written and the repair of its row', () => {
    const text = 'Plain line.\nThe team will Leverage the API.'
    expect(check(text)).toEqual({
      passed: false,
      findings: [{
        label: 'docs/page.md',
        line: 2,
        kind: 'banned',
        term: 'leverage',
        text: 'The team will Leverage the API.',
        repair: bannedRepairOf('leverage')
      }]
    })
  })

  it.each([
    ['em dash', `A${EM_DASH}B`, 'An em dash'],
    ['spaced en dash', `A ${EN_DASH} B`, 'An em dash'],
    ['curly quote', `The team${RIGHT_SINGLE_QUOTE}s page.`, 'A curly quote'],
    ['N/A', 'The value is N/A here.', '`N/A`'],
    ['trailing it', 'The service provides it.', 'A sentence or line that ends on the pronoun']
  ])('reports the %s pattern with the repair of the pattern row it is keyed to', (name, text, rowStart) => {
    expect(check(text).findings).toEqual([{ label: 'docs/page.md', line: 1, kind: 'pattern', term: name, text, repair: patternRepairOf(rowStart) }])
  })

  it.each([
    ['an unspaced en dash', `pages 1${EN_DASH}5`],
    ['the abbreviation IT at the end of a sentence', 'The team runs IT.'],
    ['it inside a sentence', 'The service sends it to the queue'],
    ['a slash between other words', 'Read the n/b note and the on/off switch.'],
    ['it followed by a code span that ends the sentence', 'Pass it `--json`.'],
    ['it followed by a URL that ends the sentence', 'Follow it https://example.test/page.']
  ])('reports no pattern for %s', (_label, text) => {
    expect(check(text).findings).toEqual([])
  })

  it('reports a sentence that ends on it inside a line, as the old gate did', () => {
    expect(lineKindTerms(check('The service provides it. The team reads the log.').findings)).toEqual([{ line: 1, kind: 'pattern', term: 'trailing it' }])
  })

  it.each([
    ['every distinct match on the line, lower-cased, in order of appearance', 'Shapes and a shape and Shapes again.', 'shapes, shape'],
    ['a phrase with its runs of whitespace collapsed to one space', 'The point is held   open\tunder review.', 'held open under'],
    ['a form with a trailing star by its matched ending', 'The tool unlocks access.', 'unlocks']
  ])('names in the term %s', (_label, text, term) => {
    expect(check(text).findings.map((finding) => finding.term)).toEqual([term])
  })

  it('names the longest form that matches where a shorter form of the row also matches, as the old gate did', () => {
    const prefixRows = { ...rows, banned: [{ forms: ['deep', 'deep dive'], repair: 'examine', scope: 'all', caseSensitive: false }], examine: [] }
    const result = runProseCheck({ texts: [{ label: 'docs/page.md', text: 'The team took a deep dive.' }], rows: prefixRows })
    expect(result.findings.map(({ term }) => term)).toEqual(['deep dive'])
  })

  it('ignores a form that sits inside a longer word', () => {
    expect(check('The team reads the reshaped table and the portals list.').findings).toEqual([])
  })

  it('ignores a form inside a code span or a URL, and reports the line that holds the form outside them', () => {
    const text = 'The `portal` value and https://portal.example.test pass.\nThe portal fails.'
    expect(lineKindTerms(check(text).findings)).toEqual([{ line: 2, kind: 'banned', term: 'portal' }])
  })

  it('passes a text whose only findings are examine findings, keeping those findings', () => {
    expect(check('The team will deliver the report.')).toEqual({
      passed: true,
      findings: [{ label: 'docs/page.md', line: 1, kind: 'examine', term: 'deliver', text: 'The team will deliver the report.', repair: rows.examine.find(({ forms }) => forms.includes('deliver')).repair }]
    })
  })

  it('reports the line of a CRLF text as written, without the carriage return', () => {
    expect(check('Clean line.\r\nThe portal opens.\r\n').findings.map(({ line, text }) => ({ line, text }))).toEqual([{ line: 2, text: 'The portal opens.' }])
  })

  it('reports the findings of every text under its own label, in the order the texts are given', () => {
    const result = runProseCheck({ texts: [{ label: 'a.md', text: 'The portal.' }, { label: 'b.md', text: 'Clean.\nThe step simply runs.' }], rows })
    expect(result.findings.map(({ label, line, term }) => ({ label, line, term }))).toEqual([
      { label: 'a.md', line: 1, term: 'portal' },
      { label: 'b.md', line: 2, term: 'simply' }
    ])
  })

  it('refuses rows whose patterns lack the em dash row with PARSE naming the pattern and the language file', () => {
    const withoutEmDashRow = { ...rows, patterns: rows.patterns.filter(({ description }) => !description.startsWith('An em dash')) }
    expect(() => runProseCheck({ texts: [], rows: withoutEmDashRow })).toThrow(expect.objectContaining({
      code: 'PARSE',
      message: `The Patterns table in the language file ${LANGUAGE_FILE} has no row that starts "An em dash", the row the em dash pattern reports. Restore the row, then run the command again.`
    }))
  })
})

describe('the readers', () => {
  let folder

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'hedy-prose-check-'))
  })

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true })
  })

  it('reads a file whole under the path as given', async () => {
    const path = join(folder, 'page.md')
    await writeFile(path, 'Line one.\nLine two.\n')
    expect(await readFileText(path)).toEqual({ label: path, text: 'Line one.\nLine two.\n' })
  })

  it('refuses a path that does not exist with USAGE naming the path', async () => {
    const path = join(folder, 'missing.md')
    const error = await rejectionOf(readFileText(path))
    expect(error).toMatchObject({ code: 'USAGE', message: `No file exists at ${path}. Check the path, then run the command again.` })
  })

  it('refuses a path under a file with USAGE naming the path', async () => {
    const file = join(folder, 'page.md')
    await writeFile(file, 'Line one.\n')
    const path = join(file, 'x.md')
    const error = await rejectionOf(readFileText(path))
    expect(error).toMatchObject({ code: 'USAGE', message: `No file exists at ${path}. Check the path, then run the command again.` })
  })

  it('reports a path in a folder without permission as UNKNOWN naming the path and the next step', async () => {
    const locked = join(folder, 'locked')
    await mkdir(locked)
    await chmod(locked, 0o000)
    const path = join(locked, 'page.md')
    const error = await rejectionOf(readFileText(path)).finally(() => chmod(locked, 0o700))
    expect(error).toMatchObject({ code: 'UNKNOWN', message: `The path ${path} could not be read. Check that the path is a regular file with read permission, then run the command again.` })
  })

  it('refuses a folder with USAGE naming the path', async () => {
    const path = join(folder, 'pages')
    await mkdir(path)
    const error = await rejectionOf(readFileText(path))
    expect(error).toMatchObject({ code: 'USAGE', message: `The path ${path} is not a regular file. Give the path of a file to check, then run the command again.` })
  })

  it('refuses a secrets file with USAGE before reading the file', async () => {
    const path = join(folder, 'x.env')
    await writeFile(path, 'TOKEN=value\n')
    const error = await rejectionOf(readFileText(path))
    expect(error.code).toBe('USAGE')
    expect(error.message).toContain('a secrets file that hedy never reads')
  })

  it('reads stdin whole under its label, joining a character split across chunks', async () => {
    const bytes = Buffer.from(`Bad ${EM_DASH} title\n`)
    const stream = Readable.from([bytes.subarray(0, 5), bytes.subarray(5), 'second line\n'])
    expect(await readStdinText(stream, { label: 'title' })).toEqual({ label: 'title', text: `Bad ${EM_DASH} title\nsecond line\n` })
  })
})

describe('renderProseCheck', () => {
  const finding = (kind, term) => ({ label: 'docs/page.md', line: 3, kind, term, text: 'The original line.', repair: 'the repair' })

  it('prints each finding with its line indented, then the counts of a failing result', () => {
    const text = renderProseCheck({ passed: false, findings: [finding('banned', 'portal'), finding('examine', 'shape, shapes'), finding('pattern', 'em dash')] })
    expect(text).toBe([
      'docs/page.md:3: banned "portal": the repair',
      '  The original line.',
      'docs/page.md:3: examine "shape, shapes": the repair',
      '  The original line.',
      'docs/page.md:3: pattern "em dash": the repair',
      '  The original line.',
      '1 banned, 1 examine, 1 pattern'
    ].join('\n'))
  })

  it('ends an examine-only result with the examine count', () => {
    expect(renderProseCheck({ passed: true, findings: [finding('examine', 'deliver')] })).toBe([
      'docs/page.md:3: examine "deliver": the repair',
      '  The original line.',
      'passed with 1 examine'
    ].join('\n'))
  })

  it('prints only passed for a clean result', () => {
    expect(renderProseCheck({ passed: true, findings: [] })).toBe('passed')
  })
})

describe('the check command, in-process', () => {
  const harness = ({ stdinText = '' } = {}) => {
    const io = captureIo()
    const program = new Command()
      .option('--json')
      .exitOverride()
      .configureOutput({ writeOut: (chunk) => io.stdout.write(chunk), writeErr: () => {} })
    register(program, { ...io, stdin: Readable.from([stdinText]), workspaceRoot: () => WORKSPACE_ROOT })
    return { program, ...io }
  }

  const envelopeOf = (out) => JSON.parse(out.join(''))

  it.each([
    [['check'], 'No text was given to check. Give one or more file paths, or --stdin with --label <name>, then run the command again.'],
    [['check', '--stdin'], '--stdin needs a non-empty --label <name>, the name each finding gives the text. Run the command again with --label.'],
    [['check', '--stdin', '--label', ' '], '--stdin needs a non-empty --label <name>, the name each finding gives the text. Run the command again with --label.'],
    [['check', '--label', 'title', 'page.md'], '--label applies only to text read from --stdin, because a file finding gives its path. Run the command again with --stdin, or without --label.'],
    [['check', '--stdin', '--label', 'title', 'page.md'], 'The check reads either file paths or --stdin, not both. Run the command again with one of them.'],
    [['check', ''], 'A file path is empty. Give the path of each file to check, then run the command again.']
  ])('refuses %j with USAGE, exit 2 and the fix on stderr', async (args, message) => {
    const h = harness()
    await h.program.parseAsync(args, { from: 'user' })
    expect(h.err.join('')).toBe(`${message}\n`)
    expect(h.out).toEqual([])
    expect(h.codes).toEqual([2])
  })

  it('fails a page with banned findings with one PROSE error naming the counts, and the result in the envelope', async () => {
    const h = harness()
    const page = fixturePath('pages/jargon.md')
    await h.program.parseAsync(['--json', 'check', page], { from: 'user' })
    const envelope = envelopeOf(h.out)
    expect(envelope.ok).toBe(false)
    expect(envelope.errors).toEqual([{ code: 'PROSE', message: 'The check found 4 banned, 1 examine and 0 pattern findings. Reword each banned and pattern finding, then run the check again.' }])
    expect(envelope.result.passed).toBe(false)
    expect(envelope.result.findings).toHaveLength(5)
    expect(envelope.result.findings.every(({ label }) => label === page)).toBe(true)
    expect(h.codes).toEqual([1])
  })

  it('passes a clean page in text mode, printing passed and exiting 0', async () => {
    const h = harness()
    await h.program.parseAsync(['check', fixturePath('pages/clean.md')], { from: 'user' })
    expect(h.out).toEqual(['passed\n'])
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([0])
  })

  it('checks every file given, in order', async () => {
    const h = harness()
    const pages = [fixturePath('pages/alone-warn.md'), fixturePath('pages/metaphor-warn.md')]
    await h.program.parseAsync(['--json', 'check', ...pages], { from: 'user' })
    const envelope = envelopeOf(h.out)
    expect(envelope.ok).toBe(true)
    expect(envelope.result.findings.map(({ label, term }) => ({ label, term }))).toEqual([
      { label: pages[0], term: 'alone' },
      { label: pages[1], term: 'lands, bites' }
    ])
    expect(h.codes).toEqual([0])
  })

  it('checks the text read from stdin under the --label value', async () => {
    const h = harness({ stdinText: await readFixture('stdin/stdin-title-viol.txt') })
    await h.program.parseAsync(['--json', 'check', '--stdin', '--label', 'title'], { from: 'user' })
    const envelope = envelopeOf(h.out)
    expect(envelope.result.findings.map(({ label, line, kind, term }) => ({ label, line, kind, term }))).toEqual([
      { label: 'title', line: 1, kind: 'pattern', term: 'em dash' }
    ])
    expect(h.codes).toEqual([1])
  })
})

describe('hedy prose check, spawned', () => {
  const failingPage = fixturePath('pages/jargon.md')

  it('--json on a page with banned findings exits 1 with one PROSE error and the failing result', async () => {
    const result = await runCli(['prose', 'check', '--json', failingPage], { workspace: WORKSPACE_ROOT })
    expect(result.exitCode).toBe(1)
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.errors.map(({ code }) => code)).toEqual(['PROSE'])
    expect(result.envelope.result.passed).toBe(false)
    expect(result.envelope.result.findings.length).toBeGreaterThan(0)
  })

  it('--json on a clean page exits 0 with a passing result', async () => {
    const result = await runCli(['prose', 'check', '--json', fixturePath('pages/clean.md')], { workspace: WORKSPACE_ROOT })
    expect(result.exitCode).toBe(0)
    expect(result.envelope.ok).toBe(true)
    expect(result.envelope.result.passed).toBe(true)
  })

  it('--json on a missing path exits 2 with USAGE and a null result', async () => {
    const result = await runCli(['prose', 'check', '--json', fixturePath('pages/no-such-page.md')], { workspace: WORKSPACE_ROOT })
    expect(result.exitCode).toBe(2)
    expect(result.envelope.errors.map(({ code }) => code)).toEqual(['USAGE'])
    expect(result.envelope.result).toBeNull()
  })

  it('--json --stdin --label title exits 1 with the em dash finding at line 1 under the label title', async () => {
    const input = await readFixture('stdin/stdin-title-viol.txt')
    const result = await runCli(['prose', 'check', '--json', '--stdin', '--label', 'title'], { workspace: WORKSPACE_ROOT, input })
    expect(result.exitCode).toBe(1)
    expect(result.envelope.result.findings).toEqual([
      expect.objectContaining({ label: 'title', line: 1, kind: 'pattern', term: 'em dash' })
    ])
  })

  it('in text mode on a failing page exits 1, prints the findings on stdout and the PROSE message on stderr', async () => {
    const result = await runCli(['prose', 'check', failingPage], { workspace: WORKSPACE_ROOT })
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain(`${failingPage}:3: banned "leverage": ${bannedRepairOf('leverage')}`)
    expect(result.stdout.split('\n').at(-1)).toBe('4 banned, 1 examine, 0 pattern')
    expect(result.stderr).toBe('The check found 4 banned, 1 examine and 0 pattern findings. Reword each banned and pattern finding, then run the check again.')
  })

  it('--stdin without --label exits 2', async () => {
    const result = await runCli(['prose', 'check', '--stdin'], { workspace: WORKSPACE_ROOT, input: 'Text.' })
    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('--label')
  })
})
