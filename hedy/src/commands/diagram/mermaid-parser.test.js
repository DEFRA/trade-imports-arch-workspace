import { rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createFakeMermaidWorkspace } from '../../test-support/fake-mermaid.js'
import { parseDiagrams } from './mermaid-parser.js'

let workspace
beforeEach(async () => { workspace = await createFakeMermaidWorkspace() })
afterEach(() => rm(workspace, { recursive: true, force: true }))

describe('parseDiagrams', () => {
  it('gives each diagram the verdict of the workspace tooling\'s Mermaid, loaded with a browser window in place', async () => {
    expect(await parseDiagrams([
      { label: 'a.mmd', text: 'sequenceDiagram\n  A->>B: Hi' },
      { label: 'p.md:4', text: 'flowchart LR\n  FAIL on line 2' }
    ], { workspaceRoot: workspace })).toEqual([
      { label: 'a.mmd', ok: true, type: 'sequenceDiagram' },
      { label: 'p.md:4', ok: false, message: 'Parse error on line 2:\nflowchart LR\n  FAIL on line 2' }
    ])
  })

  it('accepts a workspace root given relative to the current folder', async () => {
    const verdicts = await parseDiagrams([{ label: 'a.mmd', text: 'graph TD' }], { workspaceRoot: relative(process.cwd(), workspace) })
    expect(verdicts).toEqual([{ label: 'a.mmd', ok: true, type: 'graph' }])
  })

  it('gives no verdicts, without loading Mermaid, when there is no diagram to parse', async () => {
    const bare = await createFakeMermaidWorkspace({ withMermaid: false })
    try {
      expect(await parseDiagrams([], { workspaceRoot: bare })).toEqual([])
    } finally {
      await rm(bare, { recursive: true, force: true })
    }
  })

  it('refuses with SETUP and the next step when the workspace tooling has no Mermaid installed', async () => {
    const bare = await createFakeMermaidWorkspace({ withMermaid: false })
    try {
      await expect(parseDiagrams([{ label: 'a.mmd', text: 'graph TD' }], { workspaceRoot: bare })).rejects.toMatchObject({
        code: 'SETUP',
        message: expect.stringContaining('Mermaid is not installed in')
      })
    } finally {
      await rm(bare, { recursive: true, force: true })
    }
  })

  const replaceMermaid = (source) =>
    writeFile(join(workspace, 'delivery-info-arch-tooling', 'node_modules', 'mermaid', 'index.js'), source)

  it('refuses with SETUP, quoting the reason, when Mermaid fails to load', async () => {
    await replaceMermaid("throw new Error('the install is broken')")
    await expect(parseDiagrams([{ label: 'a.mmd', text: 'graph TD' }], { workspaceRoot: workspace })).rejects.toMatchObject({
      code: 'SETUP',
      message: expect.stringContaining('the install is broken')
    })
  })

  it('reports an internal fault, as UNKNOWN, when the parser\'s output is not its verdicts', async () => {
    await replaceMermaid("export default { async parse () { process.stdout.write('noise'); return { diagramType: 'graph' } } }")
    await expect(parseDiagrams([{ label: 'a.mmd', text: 'graph TD' }], { workspaceRoot: workspace })).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: expect.stringContaining('The Mermaid parser gave output that is not its verdicts')
    })
  })

  it('stops a parser that runs past its time limit and reports the limit', async () => {
    await replaceMermaid('export default { parse: () => new Promise(() => setInterval(() => {}, 1000)) }')
    await expect(parseDiagrams([{ label: 'a.mmd', text: 'graph TD' }], { workspaceRoot: workspace, timeoutMs: 300 })).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: expect.stringContaining('did not finish within 300 ms')
    })
  })
})
