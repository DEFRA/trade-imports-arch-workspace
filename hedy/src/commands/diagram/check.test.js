import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
