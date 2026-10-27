import { describe, it, expect } from 'vitest'
import { HedyError } from './errors.js'
import { runAction } from './run-action.js'

const harness = () => {
  const out = []
  const err = []
  const codes = []
  return {
    out,
    err,
    codes,
    options: {
      stdout: { write: (chunk) => out.push(chunk) },
      stderr: { write: (chunk) => err.push(chunk) },
      setExitCode: (code) => codes.push(code)
    }
  }
}

const singleJsonLine = (chunks) => {
  const lines = chunks.join('').split('\n')
  expect(lines).toHaveLength(2)
  expect(lines[1]).toBe('')
  return JSON.parse(lines[0])
}

describe('runAction', () => {
  it('in text mode prints the rendered result to stdout and returns 0', async () => {
    const h = harness()
    const code = await runAction(() => ({ name: 'hedy' }), {
      ...h.options,
      render: (result) => `name: ${result.name}`
    })
    expect(code).toBe(0)
    expect(h.out).toEqual(['name: hedy\n'])
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([0])
  })

  it('in text mode defaults to String(result) when no render is given', async () => {
    const h = harness()
    await runAction(() => 7, h.options)
    expect(h.out).toEqual(['7\n'])
  })

  it('in JSON mode prints exactly one line that parses to a success envelope', async () => {
    const h = harness()
    const code = await runAction(() => ({ answer: 42 }), { ...h.options, json: true })
    const envelope = singleJsonLine(h.out)
    expect(code).toBe(0)
    expect(envelope.ok).toBe(true)
    expect(envelope.result).toEqual({ answer: 42 })
    expect(envelope.errors).toEqual([])
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([0])
  })

  it('on a USAGE HedyError in JSON mode prints one failure envelope line, nothing on stderr, and returns 2', async () => {
    const h = harness()
    const code = await runAction(() => { throw new HedyError('USAGE', 'Unknown flag --nope.') }, { ...h.options, json: true })
    const envelope = singleJsonLine(h.out)
    expect(code).toBe(2)
    expect(envelope.ok).toBe(false)
    expect(envelope.errors).toEqual([{ code: 'USAGE', message: 'Unknown flag --nope.' }])
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([2])
  })

  it('on a thrown TypeError in text mode prints only the message to stderr, nothing on stdout, and returns 1', async () => {
    const h = harness()
    const code = await runAction(() => { throw new TypeError('x is not a function') }, h.options)
    expect(code).toBe(1)
    expect(h.err).toEqual(['x is not a function\n'])
    expect(h.err.join('')).not.toMatch(/\n\s+at /)
    expect(h.out).toEqual([])
    expect(h.codes).toEqual([1])
  })

  it('awaits an async action that resolves later', async () => {
    const h = harness()
    const action = () => new Promise((resolve) => setTimeout(() => resolve('late'), 20))
    const code = await runAction(action, h.options)
    expect(code).toBe(0)
    expect(h.out).toEqual(['late\n'])
  })

  it('treats a rejected async action like a thrown error', async () => {
    const h = harness()
    const code = await runAction(async () => { throw new HedyError('USAGE', 'Missing argument.') }, h.options)
    expect(code).toBe(2)
    expect(h.err).toEqual(['Missing argument.\n'])
    expect(h.out).toEqual([])
    expect(h.codes).toEqual([2])
  })

  it('treats a render that throws as an UNKNOWN failure and writes nothing to stdout', async () => {
    const h = harness()
    const code = await runAction(() => 'x', {
      ...h.options,
      render: () => { throw new Error('render failed') }
    })
    expect(code).toBe(1)
    expect(h.err).toEqual(['render failed\n'])
    expect(h.out).toEqual([])
    expect(h.codes).toEqual([1])
  })
})

describe('runAction on an AggregateError', () => {
  const failures = () => new AggregateError([
    new HedyError('USAGE', 'Jira refused the request.'),
    new HedyError('AUTH', 'Confluence rejected the credentials.')
  ], 'Several failures')

  it('in JSON mode prints one envelope whose errors hold each error in order, nothing on stderr, and returns the lowest exit code', async () => {
    const h = harness()
    const code = await runAction(() => { throw failures() }, { ...h.options, json: true })
    const envelope = singleJsonLine(h.out)
    expect(envelope.ok).toBe(false)
    expect(envelope.errors).toEqual([
      { code: 'USAGE', message: 'Jira refused the request.' },
      { code: 'AUTH', message: 'Confluence rejected the credentials.' }
    ])
    expect(h.err).toEqual([])
    expect(code).toBe(1)
    expect(h.codes).toEqual([1])
  })

  it('in text mode writes each message on its own stderr line, nothing on stdout, and returns the lowest exit code', async () => {
    const h = harness()
    const code = await runAction(() => { throw failures() }, h.options)
    expect(h.err.join('')).toBe('Jira refused the request.\nConfluence rejected the credentials.\n')
    expect(h.out).toEqual([])
    expect(code).toBe(1)
    expect(h.codes).toEqual([1])
  })

  it('returns 2 when every error it holds is USAGE', async () => {
    const h = harness()
    const code = await runAction(() => {
      throw new AggregateError([new HedyError('USAGE', 'First.'), new HedyError('USAGE', 'Second.')])
    }, h.options)
    expect(code).toBe(2)
    expect(h.codes).toEqual([2])
  })
})
