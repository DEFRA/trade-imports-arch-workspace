import { describe, it, expect } from 'vitest'
import { verdictsOf } from './mermaid-verdicts.js'

const fakeParse = async (text) => {
  if (text.startsWith('bad')) throw new Error('Parse error on line 2:\n...A->>: hi')
  return { diagramType: text.split(' ')[0] }
}

describe('verdictsOf', () => {
  it('gives each diagram its verdict in order: the type Mermaid found, or Mermaid\'s message', async () => {
    expect(await verdictsOf(fakeParse, [
      { label: 'a.mmd', text: 'sequence diagram' },
      { label: 'p.md:4', text: 'bad diagram' }
    ])).toEqual([
      { label: 'a.mmd', ok: true, type: 'sequence' },
      { label: 'p.md:4', ok: false, message: 'Parse error on line 2:\n...A->>: hi' }
    ])
  })

  it('parses one diagram at a time, because Mermaid keeps the state of a parse in shared modules', async () => {
    const overlap = { active: 0, most: 0 }
    const slowParse = async () => {
      overlap.active += 1
      overlap.most = Math.max(overlap.most, overlap.active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      overlap.active -= 1
      return { diagramType: 'sequence' }
    }
    await verdictsOf(slowParse, [{ label: 'a', text: 'a' }, { label: 'b', text: 'b' }, { label: 'c', text: 'c' }])
    expect(overlap.most).toBe(1)
  })
})
