import { Command } from 'commander'
import { describe, it, expect } from 'vitest'
import { register, runHello } from './hello.js'

const harness = () => {
  const out = []
  const err = []
  const codes = []
  const program = new Command().option('--json').exitOverride()
  register(program, {
    stdout: { write: (chunk) => out.push(chunk) },
    stderr: { write: (chunk) => err.push(chunk) },
    setExitCode: (code) => codes.push(code)
  })
  return { program, out, err, codes }
}

describe('runHello', () => {
  it('returns the greeting as the result message', () => {
    expect(runHello()).toEqual({ message: 'Hello from hedy' })
  })
})

describe('the hello command', () => {
  it('in text mode prints only the message and sets exit 0', async () => {
    const h = harness()
    await h.program.parseAsync(['hello'], { from: 'user' })
    expect(h.out).toEqual(['Hello from hedy\n'])
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([0])
  })

  it('with the global --json prints one success envelope whose result holds the message', async () => {
    const h = harness()
    await h.program.parseAsync(['hello', '--json'], { from: 'user' })
    expect(h.out).toHaveLength(1)
    const envelope = JSON.parse(h.out[0])
    expect(envelope.ok).toBe(true)
    expect(envelope.result).toEqual({ message: 'Hello from hedy' })
    expect(h.codes).toEqual([0])
  })
})
