import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createWorkspace } from './cli.js'

const FAKE_MERMAID = `
const windowAtLoad = typeof globalThis.window?.document === 'object'
const FAKE_COLOURS = ['Aqua', 'Red']

const typeOf = (text) => {
  const firstWord = text.trim().split(/\\s/)[0]
  return firstWord === 'sequenceDiagram' ? 'sequence' : firstWord
}

const groupName = (boxText) => {
  const [first, ...rest] = boxText.trim().split(/\\s+/)
  return FAKE_COLOURS.includes(first) ? rest.join(' ') : boxText.trim()
}

export default {
  async parse (text) {
    const missing = text.match(/NEEDS (\\w+)/)
    if (missing !== null) throw new ReferenceError(missing[1] + ' is not defined')
    const failure = text.match(/FAIL on line (\\d+)/)
    if (failure !== null) throw new Error('Parse error on line ' + failure[1] + ':\\n' + text)
    return { diagramType: windowAtLoad ? typeOf(text) : 'loaded-without-window' }
  },
  mermaidAPI: {
    async getDiagramFromText (text) {
      const boxes = [...text.matchAll(/^\\s*box\\s+(.*)$/gm)].map(([, boxText]) => ({ name: groupName(boxText) || undefined }))
      return { db: { getBoxes: () => boxes } }
    }
  }
}
`

const installTooling = async (root) => {
  const tooling = join(root, 'delivery-info-arch-tooling')
  await mkdir(tooling, { recursive: true })
  await writeFile(join(tooling, 'package.json'), JSON.stringify({ name: '@defra/delivery-info-arch-tooling' }))
  return tooling
}

/**
 * Gives the workspace at root a delivery-info-arch-tooling folder holding a
 * fake Mermaid package at version 0.0.0-fake. The fake's parse throws the
 * ReferenceError "<name> is not defined" for a text holding "NEEDS <name>",
 * rejects a text holding "FAIL on line <n>" with Mermaid's message for line n,
 * and otherwise gives the
 * text's first word as the diagram type, sequence for sequenceDiagram, or
 * "loaded-without-window" when no browser window existed when the fake
 * loaded. Its mermaidAPI.getDiagramFromText names each box group as Mermaid
 * does, treating a first word of Aqua or Red as a colour and the rest as the
 * name, with no name when nothing remains.
 *
 * @param {string} root
 */
export const installFakeMermaid = async (root) => {
  const mermaid = join(await installTooling(root), 'node_modules', 'mermaid')
  await mkdir(mermaid, { recursive: true })
  await writeFile(join(mermaid, 'package.json'), JSON.stringify({ name: 'mermaid', version: '0.0.0-fake', type: 'module', exports: { '.': { import: './index.js', default: './index.js' }, './*': './*' } }))
  await writeFile(join(mermaid, 'index.js'), FAKE_MERMAID)
}

/**
 * Creates a temporary workspace, as createWorkspace does, with the fake
 * Mermaid of installFakeMermaid. The caller removes the folder.
 *
 * @param {{ withMermaid?: boolean }} [options] withMermaid false leaves the tooling folder without Mermaid
 * @returns {Promise<string>} the workspace's absolute path
 */
export const createFakeMermaidWorkspace = async ({ withMermaid = true } = {}) => {
  const root = await createWorkspace()
  if (withMermaid) await installFakeMermaid(root)
  else await installTooling(root)
  return root
}
