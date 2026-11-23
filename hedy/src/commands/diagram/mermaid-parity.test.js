import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
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
})
