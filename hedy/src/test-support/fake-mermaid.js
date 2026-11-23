import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const FAKE_MERMAID = `
const windowAtLoad = typeof globalThis.window?.document === 'object'

export default {
  async parse (text) {
    const failure = text.match(/FAIL on line (\\d+)/)
    if (failure !== null) throw new Error('Parse error on line ' + failure[1] + ':\\n' + text)
    return { diagramType: windowAtLoad ? text.split(/\\s/)[0] : 'loaded-without-window' }
  }
}
`

/**
 * Creates a temporary workspace whose delivery-info-arch-tooling folder holds
 * a fake Mermaid package. The fake's parse rejects a text holding
 * "FAIL on line <n>" with Mermaid's message for line n, and otherwise gives the
 * text's first word as the diagram type, or "loaded-without-window" when no
 * browser window existed when the fake loaded. The caller removes the folder.
 *
 * @param {{ withMermaid?: boolean }} [options] withMermaid false leaves Mermaid out
 * @returns {Promise<string>} the workspace's absolute path
 */
export const createFakeMermaidWorkspace = async ({ withMermaid = true } = {}) => {
  const root = await mkdtemp(join(tmpdir(), 'hedy-mermaid-'))
  const tooling = join(root, 'delivery-info-arch-tooling')
  await mkdir(tooling, { recursive: true })
  await writeFile(join(tooling, 'package.json'), JSON.stringify({ name: '@defra/delivery-info-arch-tooling' }))
  if (!withMermaid) return root
  const mermaid = join(tooling, 'node_modules', 'mermaid')
  await mkdir(mermaid, { recursive: true })
  await writeFile(join(mermaid, 'package.json'), JSON.stringify({ name: 'mermaid', type: 'module', exports: { import: './index.js', default: './index.js' } }))
  await writeFile(join(mermaid, 'index.js'), FAKE_MERMAID)
  return root
}
