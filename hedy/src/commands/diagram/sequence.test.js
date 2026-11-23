import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { runCli } from '../../test-support/cli.js'
import { createFakeMermaidWorkspace } from '../../test-support/fake-mermaid.js'
import { captureIo } from '../../test-support/io.js'
import { svgTokens, zoneBandLabels } from '../../test-support/svg-tokens.js'
import { register } from './sequence.js'

const TRIAL = fileURLToPath(new URL('./__fixtures__/sequence/body-01.mmd', import.meta.url))

let folder
let workspace
beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'hedy-diagram-'))
  workspace = await createFakeMermaidWorkspace()
})
afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
  await rm(workspace, { recursive: true, force: true })
})

const harness = () => {
  const io = captureIo()
  const program = new Command().option('--json').exitOverride()
  register(program.command('diagram'), { ...io, workspaceRoot: () => workspace })
  const run = (...args) => program.parseAsync(['diagram', 'sequence', ...args], { from: 'user' })
  return { run, ...io }
}

const envelopeOf = ({ out }) => JSON.parse(out.join(''))

const writeSource = async (name, ...lines) => {
  const path = join(folder, name)
  await writeFile(path, ['sequenceDiagram', ...lines].join('\n'))
  return path
}

describe('hedy diagram sequence labels zone bands', () => {
  it('labels each band with the name Mermaid gives the group, and leaves a group Mermaid gives no name without a label', async () => {
    const h = harness()
    const source = await writeSource('zones.mmd',
      'box Aqua Public zone', '  participant A as Alpha', 'end',
      'box Red', '  participant B as Beta', 'end',
      'A->>B: Hello')
    const output = join(folder, 'zones.svg')
    await h.run(source, output)
    expect(zoneBandLabels(await readFile(output, 'utf8'))).toEqual(['PUBLIC ZONE'])
  })
})

describe('hedy diagram sequence draws a source', () => {
  it('writes the SVG and reports the source, the output, the size and the number of steps', async () => {
    const h = harness()
    const output = join(folder, 'trial.svg')
    await h.run('--json', TRIAL, output)
    const { ok, result } = envelopeOf(h)
    expect(ok).toBe(true)
    expect(result).toEqual({ source: TRIAL, output, width: 1634, height: 1224, steps: 12 })
    const svg = await readFile(output, 'utf8')
    expect(() => svgTokens(svg)).not.toThrow()
    expect(h.codes).toEqual([0])
  })

  it('prints one line in text mode and leaves no temporary file beside the output', async () => {
    const h = harness()
    const output = join(folder, 'trial.svg')
    await h.run(TRIAL, output)
    expect(h.out).toEqual([`Drew ${output} from ${TRIAL}: 12 steps, 1634 by 1224.\n`])
    expect(await readdir(folder)).toEqual(['trial.svg'])
  })

  it('replaces an earlier drawing at the output path', async () => {
    const output = join(folder, 'trial.svg')
    await writeFile(output, 'earlier drawing')
    await harness().run(TRIAL, output)
    expect(await readFile(output, 'utf8')).toMatch(/^<svg /)
  })
})

describe('hedy diagram sequence refuses what it cannot draw', () => {
  it('refuses a source Mermaid rejects, naming the line and Mermaid\'s message, before reading the source itself, and leaves the earlier drawing untouched', async () => {
    const h = harness()
    const source = await writeSource('flow.mmd', 'participant A as Alpha', 'participant B as Beta', '%% FAIL on line 4', 'A->>B: Hello')
    const output = join(folder, 'flow.svg')
    await writeFile(output, 'earlier drawing')
    await h.run('--json', source, output)
    const { ok, errors } = envelopeOf(h)
    expect(ok).toBe(false)
    expect(errors).toEqual([{ code: 'PARSE', message: expect.stringContaining(`${source}:4: Mermaid does not accept the source: Parse error on line 4:`) }])
    expect(h.codes).toEqual([1])
    expect(await readFile(output, 'utf8')).toBe('earlier drawing')
  })

  it('reports every refused line as a PARSE error with exit 1 and leaves the earlier drawing untouched', async () => {
    const h = harness()
    const source = await writeSource('flow.mmd', 'participant A as Alpha', 'loop Every minute', 'A->>B: Hello', 'end')
    const output = join(folder, 'flow.svg')
    await writeFile(output, 'earlier drawing')
    await h.run('--json', source, output)
    const { ok, errors } = envelopeOf(h)
    expect(ok).toBe(false)
    expect(errors.map(({ code, message }) => [code, message.split(' ')[0]])).toEqual([
      ['PARSE', `${source}:3:`],
      ['PARSE', `${source}:4:`],
      ['PARSE', `${source}:5:`]
    ])
    expect(h.codes).toEqual([1])
    expect(await readFile(output, 'utf8')).toBe('earlier drawing')
  })

  it.each([
    ['an output that is not an SVG file', (source) => [source, join(folder, 'flow.mmd')], 'does not end in .svg'],
    ['a missing source', () => [join(folder, 'missing.mmd'), join(folder, 'out.svg')], 'No file exists at'],
    ['an output folder that does not exist', (source) => [source, join(folder, 'absent', 'out.svg')], 'The folder']
  ])('refuses %s as a usage error with exit 2 and writes nothing', async (_, argsFor, message) => {
    const h = harness()
    const source = await writeSource('flow.mmd', 'participant A as Alpha')
    const before = await readdir(folder)
    await h.run(...argsFor(source))
    expect(h.err.join('')).toContain(message)
    expect(h.codes).toEqual([2])
    expect(await readdir(folder)).toEqual(before)
  })
})

describe('hedy diagram sequence when the drawing cannot be written', () => {
  it('reports the output path with exit 1 and leaves no temporary file behind', async () => {
    const h = harness()
    const output = join(folder, 'taken.svg')
    await mkdir(output)
    await h.run(TRIAL, output)
    expect(h.err.join('')).toContain(`The drawing could not be written to ${output}.`)
    expect(h.codes).toEqual([1])
    expect(await readdir(folder)).toEqual(['taken.svg'])
  })
})

describe('hedy diagram sequence, spawned', () => {
  it('prints one envelope line and exits 0 for a drawn source', async () => {
    const output = join(folder, 'trial.svg')
    const { exitCode, envelope } = await runCli(['--json', 'diagram', 'sequence', TRIAL, output], { workspace })
    expect(exitCode).toBe(0)
    expect(envelope.result.steps).toBe(12)
  })

  it('exits 1 with the line number on stderr for a source it cannot draw', async () => {
    const source = await writeSource('flow.mmd', 'participant A as Alpha', 'A-xA: lost')
    const { exitCode, stderr } = await runCli(['diagram', 'sequence', source, join(folder, 'flow.svg')], { workspace })
    expect(exitCode).toBe(1)
    expect(stderr).toContain(`${source}:3: "-x" is not a construct the renderer draws.`)
  })
})
