import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'
import { verdictsOf } from './mermaid-verdicts.js'

const readInput = async (stream) => {
  const chunks = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

const installBrowserWindow = () => {
  const { window } = new JSDOM('<!doctype html><html><body></body></html>')
  globalThis.window = window
  globalThis.document = window.document
}

const loadMermaid = async (entry) => {
  installBrowserWindow()
  const { default: mermaid } = await import(pathToFileURL(entry).href)
  return mermaid
}

const groupNames = async (mermaid, text) => {
  const diagram = await mermaid.mermaidAPI.getDiagramFromText(text)
  return diagram.db.getBoxes().map(({ name }) => name ?? '')
}

const describedParse = (mermaid) => async (text) => {
  const { diagramType } = await mermaid.parse(text)
  return diagramType === 'sequence' ? { diagramType, groups: await groupNames(mermaid, text) } : { diagramType }
}

const [mermaidEntry] = process.argv.slice(2)
const mermaid = await loadMermaid(mermaidEntry)
const diagrams = JSON.parse(await readInput(process.stdin))
process.stdout.write(JSON.stringify(await verdictsOf(describedParse(mermaid), diagrams)))
