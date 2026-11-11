import { Command } from 'commander'
import { describe, it, expect } from 'vitest'
import { captureIo } from '../test-support/io.js'
import { register, runHello } from './hello.js'

const harness = () => {
  const io = captureIo()
  const program = new Command().option('--json').exitOverride()
  register(program, io)
  return { program, ...io }
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
