import { Command } from 'commander'
import { describe, it, expect } from 'vitest'
import { rejectionOf } from '../../test-support/http.js'
import { captureIo } from '../../test-support/io.js'
import { register } from './index.js'

const harness = () => {
  const io = captureIo()
  const program = new Command()
    .option('--json')
    .exitOverride()
    .configureOutput({ writeOut: (chunk) => io.stdout.write(chunk), writeErr: () => {} })
  register(program, io)
  return { program, ...io }
}

describe('the diagram group', () => {
  it('lists the sequence command in its help and describes the group as drawing diagrams from their sources', async () => {
    const h = harness()
    const error = await rejectionOf(h.program.parseAsync(['diagram', '--help'], { from: 'user' }))
    expect(error.code).toBe('commander.helpDisplayed')
    const help = h.out.join('')
    expect(help).toMatch(/^ {2}sequence <source> <output>\s/m)
    expect(help).toContain('Draw diagrams from their sources')
  })

  it('lists the Mermaid constructs the sequence command draws in its help', async () => {
    const h = harness()
    await rejectionOf(h.program.parseAsync(['diagram', 'sequence', '--help'], { from: 'user' }))
    const help = h.out.join('')
    for (const construct of ['participant ID as Title', 'box Zone name', 'A->>B', 'A-->>B', 'Note over A', 'alt condition']) {
      expect(help).toContain(construct)
    }
  })
})
