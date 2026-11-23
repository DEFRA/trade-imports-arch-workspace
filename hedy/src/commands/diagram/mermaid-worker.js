import { pathToFileURL } from 'node:url'
import { parseHTML } from 'linkedom'
import { verdictsOf } from './mermaid-verdicts.js'

const readInput = async (stream) => {
  const chunks = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

const installBrowserWindow = () => {
  const { window, document } = parseHTML('<!doctype html><html><body></body></html>')
  globalThis.window = window
  globalThis.document = document
}

const loadMermaid = async (entry) => {
  installBrowserWindow()
  const { default: mermaid } = await import(pathToFileURL(entry).href)
  return mermaid
}

const [mermaidEntry] = process.argv.slice(2)
const mermaid = await loadMermaid(mermaidEntry)
const diagrams = JSON.parse(await readInput(process.stdin))
process.stdout.write(JSON.stringify(await verdictsOf((text) => mermaid.parse(text), diagrams)))
