import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { Command } from 'commander'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { runCli } from '../../test-support/cli.js'
import { createFakeMermaidWorkspace } from '../../test-support/fake-mermaid.js'
import { captureIo } from '../../test-support/io.js'
import { register } from './check.js'

let workspace
let folder
beforeEach(async () => {
  workspace = await createFakeMermaidWorkspace()
  folder = await mkdtemp(join(tmpdir(), 'hedy-check-'))
})
afterEach(async () => {
  await rm(workspace, { recursive: true, force: true })
  await rm(folder, { recursive: true, force: true })
})

const harness = ({ stdinText = '' } = {}) => {
  const io = captureIo()
  const program = new Command().option('--json').exitOverride()
  register(program.command('diagram'), { ...io, stdin: Readable.from([stdinText]), workspaceRoot: () => workspace })
  const run = (...args) => program.parseAsync(['diagram', 'check', ...args], { from: 'user' })
  return { run, ...io }
}

const envelopeOf = ({ out }) => JSON.parse(out.join(''))

const writeFixture = async (name, text) => {
  const path = join(folder, name)
  await writeFile(path, text)
  return path
}

describe('hedy diagram check on a Mermaid file', () => {
  it('passes a diagram Mermaid accepts, with exit 0 and the type Mermaid found', async () => {
    const h = harness()
    const path = await writeFixture('flow.mmd', 'flowchart LR\n  A --> B\n')
    await h.run('--json', path)
    expect(envelopeOf(h)).toMatchObject({
      ok: true,
      result: { passed: true, files: 1, diagrams: [{ label: path, ok: true, type: 'flowchart' }] }
    })
    expect(h.codes).toEqual([0])
  })

  it('fails a diagram Mermaid rejects with exit 1 and one PARSE error, and gives the line of the file with Mermaid\'s message', async () => {
    const h = harness()
    const path = await writeFixture('flow.mmd', 'sequenceDiagram\n  FAIL on line 2\n')
    await h.run('--json', path)
    const { ok, errors, result } = envelopeOf(h)
    expect(ok).toBe(false)
    expect(errors).toEqual([{ code: 'PARSE', message: 'The check found 1 diagram that Mermaid rejects. Fix each line the result names, then run the check again.' }])
    expect(result).toMatchObject({ passed: false, files: 1, diagrams: [{ label: path, ok: false, line: 2, message: expect.stringContaining('Parse error on line 2:') }] })
    expect(h.codes).toEqual([1])
  })

  it('prints a line per diagram and a summary in text mode, with each failure\'s file line and Mermaid\'s message beneath it', async () => {
    const h = harness()
    const good = await writeFixture('a.mmd', 'flowchart LR\n')
    const bad = await writeFixture('b.mmd', 'sequenceDiagram\n  FAIL on line 2\n')
    await h.run(good, bad)
    expect(h.out.join('')).toBe([
      `PASS  ${good}  flowchart`,
      `FAIL  ${bad}  line 2`,
      '      Parse error on line 2:',
      '      sequenceDiagram',
      '        FAIL on line 2',
      '',
      '2 diagrams in 2 files: 1 passed, 1 failed.',
      ''
    ].join('\n'))
    expect(h.err.join('')).toContain('The check found 1 diagram that Mermaid rejects.')
  })
})

describe('hedy diagram check on pages and folders', () => {
  const page = ['# Page', '', '```mermaid', 'graph TD', '```', '', '```mermaid', 'sequenceDiagram', '  FAIL on line 2', '```', ''].join('\n')

  it('checks every .mmd file and page beneath a folder, leaving out node_modules, build, generated and dot folders, and gives a page failure its page line', async () => {
    for (const [name, text] of [
      ['docs/a.mmd', 'graph TD\n'],
      ['docs/deep/page.md', page],
      ['docs/notes.md', 'No diagrams here.\n'],
      ['docs/node_modules/x.mmd', 'graph TD\n  FAIL on line 2\n'],
      ['docs/build/x.mmd', 'graph TD\n  FAIL on line 2\n'],
      ['docs/generated/x.mmd', 'graph TD\n  FAIL on line 2\n'],
      ['docs/.cache/x.mmd', 'graph TD\n  FAIL on line 2\n'],
      ['docs/readme.txt', 'graph TD\n  FAIL on line 2\n']
    ]) {
      await mkdir(dirname(join(folder, name)), { recursive: true })
      await writeFile(join(folder, name), text)
    }
    const h = harness()
    await h.run('--json', join(folder, 'docs'))
    const { result } = envelopeOf(h)
    expect(result.files).toBe(3)
    expect(result.diagrams.map(({ label, ok, line }) => ({ label, ok, line }))).toEqual([
      { label: join(folder, 'docs/a.mmd'), ok: true, line: undefined },
      { label: join(folder, 'docs/deep/page.md:3'), ok: true, line: undefined },
      { label: join(folder, 'docs/deep/page.md:7'), ok: false, line: 9 }
    ])
  })

  it('says that it found no diagram, rather than that every diagram passed, when the files hold none', async () => {
    const h = harness()
    await h.run(await writeFixture('notes.md', 'No diagrams here.\n'))
    expect(h.out).toEqual(['No Mermaid diagrams found in 1 file.\n'])
    expect(h.codes).toEqual([0])
  })
})

describe('hedy diagram check on a diagram held in context', () => {
  it('checks the diagram on stdin as one diagram under its label, with lines counted from its first line', async () => {
    const h = harness({ stdinText: 'sequenceDiagram\n  A->>B: Hi\n  FAIL on line 3\n' })
    await h.run('--json', '--stdin', '--label', 'draft: sign-in')
    expect(envelopeOf(h).result).toMatchObject({
      passed: false,
      files: 1,
      diagrams: [{ label: 'draft: sign-in', ok: false, line: 3 }]
    })
  })

  it.each([
    [['--stdin'], '--stdin needs a non-empty --label <name>'],
    [['--label', 'x', 'a.mmd'], '--label applies only to a diagram read from --stdin'],
    [['--stdin', '--label', 'x', 'a.mmd'], 'The check reads either paths or --stdin, not both.'],
    [[], 'No diagram was given to check.']
  ])('refuses %j as a usage error with exit 2', async (args, message) => {
    const h = harness()
    await h.run(...args)
    expect(h.err.join('')).toContain(message)
    expect(h.codes).toEqual([2])
  })
})

describe('hedy diagram check, spawned', () => {
  it('prints one envelope line and exits 0 when every diagram parses, and 1 when one does not', async () => {
    const good = await writeFixture('a.mmd', 'graph TD\n')
    const bad = await writeFixture('b.mmd', 'graph TD\n  FAIL on line 2\n')
    const passing = await runCli(['--json', 'diagram', 'check', good], { workspace })
    const failing = await runCli(['--json', 'diagram', 'check', good, bad], { workspace })
    expect([passing.exitCode, passing.envelope.result.passed]).toEqual([0, true])
    expect([failing.exitCode, failing.envelope.errors[0].code]).toEqual([1, 'PARSE'])
  })
})
