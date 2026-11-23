import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { describe, it, expect } from 'vitest'
import { captureIo } from '../../test-support/io.js'
import { zoneBandLabels } from '../../test-support/svg-tokens.js'
import { register as registerSequence } from './sequence.js'
import { diagramsInText } from './mermaid-diagrams.js'
import { mermaidFiles } from './mermaid-files.js'
import { parseDiagrams } from './mermaid-parser.js'

const WORKSPACE = fileURLToPath(new URL('../../../../', import.meta.url))
const FIXTURES = fileURLToPath(new URL('./__fixtures__/check/', import.meta.url))
const toolingHasMermaid = existsSync(`${WORKSPACE}delivery-info-arch-tooling/node_modules/mermaid/package.json`)

const expected = JSON.parse(await readFile(`${FIXTURES}expected-verdicts.json`, 'utf8')).verdicts

const fixtureDiagrams = async () => {
  const paths = await mermaidFiles([FIXTURES])
  const files = await Promise.all(paths.map(async (path) => ({ path: path.slice(FIXTURES.length), text: await readFile(path, 'utf8') })))
  return files.flatMap(diagramsInText)
}

const asRecorded = ({ label, ok, message }) => {
  const mermaidLine = message?.match(/on line (\d+)/)?.[1]
  return ok ? { label, ok } : { label, ok, mermaidLine: Number(mermaidLine) }
}

describe('parity with the bash check on the real Mermaid', () => {
  it.skipIf(!toolingHasMermaid)('gives every fixture the verdict and Mermaid line the bash check recorded', async () => {
    const verdicts = await parseDiagrams(await fixtureDiagrams(), { workspaceRoot: WORKSPACE })
    const byLabel = (a, b) => (a.label < b.label ? -1 : 1)
    expect(verdicts.map(asRecorded).toSorted(byLabel)).toEqual(expected.toSorted(byLabel))
  }, 60_000)

  it.skipIf(!toolingHasMermaid)('passes every approved sequence fixture, each of which holds box blocks', async () => {
    const sequenceFixtures = fileURLToPath(new URL('./__fixtures__/sequence/', import.meta.url))
    const paths = await mermaidFiles([sequenceFixtures])
    const diagrams = await Promise.all(paths.map(async (path) => ({ label: path.slice(sequenceFixtures.length), text: await readFile(path, 'utf8') })))
    const verdicts = await parseDiagrams(diagrams, { workspaceRoot: WORKSPACE })
    expect(verdicts.filter(({ ok }) => !ok).map(({ label, message }) => `${label}: ${message}`)).toEqual([])
  }, 60_000)

  it.skipIf(!toolingHasMermaid)('draws every box form with the band label Chrome gives the group, in the house style\'s capitals', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'hedy-parity-'))
    try {
      const io = captureIo()
      const program = new Command().option('--json').exitOverride()
      registerSequence(program.command('diagram'), { ...io, workspaceRoot: () => WORKSPACE })
      const output = join(folder, 'box-forms.svg')
      await program.parseAsync(['diagram', 'sequence', `${FIXTURES}box-forms.mmd`, output], { from: 'user' })
      expect(zoneBandLabels(await readFile(output, 'utf8'))).toEqual([
        'PUBLIC ZONE', 'PUBLIC ZONE', 'RGB ZONE', 'RGBA ZONE', 'HSL ZONE', 'TRANSPARENT ZONE',
        'SYSTEM ZONE', 'AWS PLATFORM', 'PROTECTED ZONE', 'CURRENT ZONE', 'RGB(NONSENSE) BAD RGB ZONE'
      ])
    } finally {
      await rm(folder, { recursive: true, force: true })
    }
  }, 60_000)

  it.skipIf(!toolingHasMermaid)('refuses to draw a source the pipeline refuses, naming the line Mermaid names', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'hedy-parity-'))
    try {
      const io = captureIo()
      const program = new Command().option('--json').exitOverride()
      registerSequence(program.command('diagram'), { ...io, workspaceRoot: () => WORKSPACE })
      await program.parseAsync(['--json', 'diagram', 'sequence', `${FIXTURES}sequence-semicolon.mmd`, join(folder, 'out.svg')], { from: 'user' })
      const { errors } = JSON.parse(io.out.join(''))
      expect(errors.map(({ code, message }) => [code, message.split(': Mermaid')[0]])).toEqual([['PARSE', `${FIXTURES}sequence-semicolon.mmd:5`]])
    } finally {
      await rm(folder, { recursive: true, force: true })
    }
  }, 60_000)
})
