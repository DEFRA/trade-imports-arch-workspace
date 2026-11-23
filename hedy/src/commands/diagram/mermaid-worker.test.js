import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { runLocalTool } from '../../local-tool.js'
import { createFakeMermaidWorkspace } from '../../test-support/fake-mermaid.js'

const WORKER = fileURLToPath(new URL('./mermaid-worker.js', import.meta.url))

let workspace
beforeEach(async () => { workspace = await createFakeMermaidWorkspace() })
afterEach(() => rm(workspace, { recursive: true, force: true }))

const runWorker = (mermaidEntry, diagrams) => runLocalTool({
  command: process.execPath,
  args: [WORKER, mermaidEntry],
  env: {},
  input: JSON.stringify(diagrams)
})

describe('the Mermaid worker', () => {
  it('reads diagrams on stdin and writes their verdicts on stdout, with a browser window in place before Mermaid loads', async () => {
    const entry = join(workspace, 'delivery-info-arch-tooling', 'node_modules', 'mermaid', 'index.js')
    const { exitCode, stdout } = await runWorker(entry, [{ label: 'a.mmd', text: 'graph TD\n  A --> B' }])
    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout)).toEqual([{ label: 'a.mmd', ok: true, type: 'graph' }])
  })

  it('gives a sequence diagram\'s verdict the names Mermaid gives its box groups, in order', async () => {
    const entry = join(workspace, 'delivery-info-arch-tooling', 'node_modules', 'mermaid', 'index.js')
    const text = 'sequenceDiagram\n  box Aqua Public zone\n    participant A as Alpha\n  end\n  box Red\n    participant B as Beta\n  end'
    const { stdout } = await runWorker(entry, [{ label: 'a.mmd', text }])
    expect(JSON.parse(stdout)).toEqual([{ label: 'a.mmd', ok: true, type: 'sequence', groups: ['Public zone', ''] }])
  })

  it('exits 1 with the reason on stderr when Mermaid cannot be loaded', async () => {
    const missing = join(workspace, 'missing', 'index.js')
    const { exitCode, stderr } = await runWorker(missing, [])
    expect(exitCode).toBe(1)
    expect(stderr).toContain(`Cannot find module '${missing}'`)
  })
})
