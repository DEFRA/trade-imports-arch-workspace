import { readFile } from 'node:fs/promises'
import { describe, it, expect } from 'vitest'
import { diagramsInText, fileLineOf } from './mermaid-diagrams.js'

const fixture = async (name) => ({ path: name, text: await readFile(new URL(`./__fixtures__/check/${name}`, import.meta.url), 'utf8') })

describe('diagramsInText', () => {
  it('reads a .mmd file as one diagram labelled with its path, whose lines count from the top of the file', () => {
    const text = 'sequenceDiagram\n  A->>B: Hello\n'
    expect(diagramsInText({ path: 'flows/a.mmd', text })).toEqual([
      { label: 'flows/a.mmd', path: 'flows/a.mmd', text, linesBefore: 0 }
    ])
  })

  it('reads each mermaid block of a page as a diagram labelled with the line of its opening fence, whose lines count from that fence', () => {
    const page = ['# Title', '', '```mermaid', 'sequenceDiagram', '  A->>B: Hi', '```', 'Text', '```mermaid', 'flowchart LR', '  A --> B', '```'].join('\n')
    expect(diagramsInText({ path: 'docs/page.md', text: page })).toEqual([
      { label: 'docs/page.md:3', path: 'docs/page.md', text: 'sequenceDiagram\n  A->>B: Hi', linesBefore: 3 },
      { label: 'docs/page.md:8', path: 'docs/page.md', text: 'flowchart LR\n  A --> B', linesBefore: 8 }
    ])
  })

  it('skips a mermaid block with nothing inside it, as the bash check does', () => {
    expect(diagramsInText({ path: 'p.md', text: '```mermaid\n```\n' })).toEqual([])
  })

  it.each([
    ['page-two-blocks.md', ['page-two-blocks.md:5', 'page-two-blocks.md:12']],
    ['page-no-blocks.md', []],
    ['page-indented-fence.md', ['page-indented-fence.md:5']],
    ['page-unclosed-fence.md', ['page-unclosed-fence.md:3']]
  ])('finds in %s the blocks the bash check labelled', async (name, labels) => {
    expect(diagramsInText(await fixture(name)).map(({ label }) => label)).toEqual(labels)
  })
})

describe('fileLineOf', () => {
  it.each([
    [{ linesBefore: 12 }, 'Parse error on line 3:\n...', 15],
    [{ linesBefore: 0 }, 'Parse error on line 5:', 5],
    [{ linesBefore: 12 }, 'No diagram type detected matching given configuration', undefined]
  ])('gives the line of the file for a diagram with %j lines before it and the message %j', (diagram, message, line) => {
    expect(fileLineOf(diagram, message)).toBe(line)
  })
})
