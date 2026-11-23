import { describe, it, expect } from 'vitest'
import { verdictsOf } from './mermaid-verdicts.js'

const fakeParse = async (text) => {
  if (text.startsWith('bad')) throw new Error('Parse error on line 2:\n...A->>: hi')
  return { diagramType: text.split(' ')[0] }
}

describe('verdictsOf', () => {
  it('gives each diagram its verdict in order: the type Mermaid found, or the diagram Mermaid rejects with Mermaid\'s message', async () => {
    expect(await verdictsOf(fakeParse, [
      { label: 'a.mmd', text: 'sequence diagram' },
      { label: 'p.md:4', text: 'bad diagram' }
    ])).toEqual([
      { label: 'a.mmd', ok: true, type: 'sequence' },
      { label: 'p.md:4', ok: false, cause: 'diagram', message: 'Parse error on line 2:\n...A->>: hi' }
    ])
  })

  it.each([
    ['ReferenceError', ReferenceError], ['TypeError', TypeError], ['RangeError', RangeError],
    ['SyntaxError', SyntaxError], ['EvalError', EvalError], ['URIError', URIError]
  ])('gives a %s the cause hedy, because a JavaScript fault means hedy could not check the diagram, and carries the fault', async (name, ErrorType) => {
    const fault = new ErrorType('Option is not defined')
    const [verdict] = await verdictsOf(async () => { throw fault }, [{ label: 'a.mmd', text: 'x' }])
    expect(verdict).toEqual({ label: 'a.mmd', ok: false, cause: 'hedy', fault: { name, message: 'Option is not defined', stack: fault.stack } })
  })

  it('gives an error of a type Mermaid defines the cause diagram', async () => {
    const rejection = Object.assign(new Error('No diagram type detected'), { name: 'UnknownDiagramError' })
    const [verdict] = await verdictsOf(async () => { throw rejection }, [{ label: 'a.mmd', text: 'x' }])
    expect(verdict).toEqual({ label: 'a.mmd', ok: false, cause: 'diagram', message: 'No diagram type detected' })
  })

  it('passes on the names of a sequence diagram\'s groups, as Mermaid names them', async () => {
    const parse = async () => ({ diagramType: 'sequence', groups: ['Public zone', ''] })
    expect(await verdictsOf(parse, [{ label: 'a.mmd', text: 'x' }])).toEqual([
      { label: 'a.mmd', ok: true, type: 'sequence', groups: ['Public zone', ''] }
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
