import { realpath, rm, symlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Command } from 'commander'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { HedyError } from '../../errors.js'
import { createWorkspace, runCli } from '../../test-support/cli.js'
import { rejectionOf } from '../../test-support/http.js'
import { captureIo } from '../../test-support/io.js'
import { checkRows, checkSummary, register, renderCheck, runWorkspaceCheck } from './check.js'

let root

beforeEach(async () => {
  root = await realpath(await createWorkspace())
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const passing = (name, detail) => ({ name, run: async () => detail })
const failing = (name, error) => ({ name, run: async () => { throw error } })

describe('runWorkspaceCheck', () => {
  it('returns the real root and every check with its detail, in order, when every check passes', async () => {
    const link = join(dirname(root), `${root.split('/').at(-1)}-link`)
    await symlink(root, link)
    try {
      const result = await runWorkspaceCheck({
        workspaceRoot: () => link,
        env: {},
        checks: [passing('First', 'one'), passing('Second', 'two')]
      })
      expect(result).toEqual({ root, checks: [{ name: 'First', detail: 'one' }, { name: 'Second', detail: 'two' }] })
    } finally {
      await rm(link)
    }
  })

  it('passes each check the real root, the env, the current folder, the home folder, the Node version and the tool runner', async () => {
    const seen = []
    const runTool = async () => ({ exitCode: 0, stdout: '', stderr: '' })
    await runWorkspaceCheck({
      workspaceRoot: () => root,
      env: { PATH: '/bin' },
      cwd: '/somewhere',
      homedir: '/home/someone',
      nodeVersion: '24.1.0',
      runTool,
      checks: [{ name: 'Probe', run: async (context) => { seen.push(context); return 'seen' } }]
    })
    expect(seen).toEqual([{ root, env: { PATH: '/bin' }, cwd: '/somewhere', homedir: '/home/someone', nodeVersion: '24.1.0', runTool }])
  })

  it('throws an AggregateError holding one SETUP error per failed check, in check order, each led by its check\'s name and "failed"', async () => {
    const error = await rejectionOf(runWorkspaceCheck({
      workspaceRoot: () => root,
      env: {},
      checks: [
        failing('First', new HedyError('SETUP', 'First is wrong. Fix it.')),
        passing('Second', 'fine'),
        failing('Third', new HedyError('USAGE', 'Third needs a value. Give one.')),
        failing('Fourth', new Error('Fourth broke.'))
      ]
    }))
    expect(error).toBeInstanceOf(AggregateError)
    expect(error.errors.map(({ code, message }) => ({ code, message }))).toEqual([
      { code: 'SETUP', message: 'First failed: First is wrong. Fix it.' },
      { code: 'SETUP', message: 'Third failed: Third needs a value. Give one.' },
      { code: 'SETUP', message: 'Fourth failed: Fourth broke.' }
    ])
  })
})

describe('checkRows', () => {
  it('gives one row per check, its name and its detail marked as a pass', () => {
    expect(checkRows({ root, checks: [{ name: 'Node', detail: 'Node 24.15.0' }] })).toEqual([['Node', 'pass, Node 24.15.0']])
  })
})

describe('checkSummary', () => {
  it.each([
    [1, 'The 1 workspace setup check passes.'],
    [11, 'All 11 workspace setup checks pass.']
  ])('states that every one of %i checks passes', (count, summary) => {
    const checks = Array.from({ length: count }, (_, index) => ({ name: `Check ${index}`, detail: 'fine' }))
    expect(checkSummary({ root, checks })).toBe(summary)
  })
})

describe('renderCheck', () => {
  it('prints a pass line per check, then the summary', () => {
    expect(renderCheck({ root, checks: [{ name: 'Node', detail: 'Node 24.15.0' }, { name: 'Git hooks', detail: 'core.hooksPath is .githooks' }] })).toBe(
      'pass Node: Node 24.15.0\npass Git hooks: core.hooksPath is .githooks\n\nAll 2 workspace setup checks pass.'
    )
  })
})

describe('the check command', () => {
  const harness = () => {
    const io = captureIo()
    const program = new Command()
      .option('--json')
      .exitOverride()
      .configureOutput({ writeOut: (chunk) => io.stdout.write(chunk), writeErr: () => {} })
    const group = program.command('workspace')
    register(group, { ...io, env: process.env, workspaceRoot: () => root })
    return { program, ...io }
  }

  it('reports each failed check in a fixture workspace as a SETUP envelope entry and exits 1', async () => {
    const h = harness()
    await h.program.parseAsync(['workspace', 'check', '--json'], { from: 'user' })
    const envelope = JSON.parse(h.out.join(''))
    expect(envelope.ok).toBe(false)
    expect(new Set(envelope.errors.map(({ code }) => code))).toEqual(new Set(['SETUP']))
    const messages = envelope.errors.map(({ message }) => message)
    expect(messages).toContain(`Child repos failed: The Makefile at ${join(root, 'Makefile')} has no CHILDREN line. Restore the line, then run the check again.`)
    expect(messages).toContain(`Git hooks failed: core.hooksPath is not set, so the pre-commit gates do not run. Set it with make -C ${root} install.`)
    expect(h.codes).toEqual([1])
  })

  it('writes each failed check on its own stderr line in text mode', async () => {
    const h = harness()
    await h.program.parseAsync(['workspace', 'check'], { from: 'user' })
    const lines = h.err.join('').trim().split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(lines).toContain(`Git hooks failed: core.hooksPath is not set, so the pre-commit gates do not run. Set it with make -C ${root} install.`)
    expect(h.out).toEqual([])
  })

  it('refuses an unknown option with exit 2', async () => {
    const h = harness()
    const error = await rejectionOf(h.program.parseAsync(['workspace', 'check', '--bogus'], { from: 'user' }))
    expect(error.code).toBe('commander.unknownOption')
  })
})

describe('hedy workspace check, spawned', () => {
  it('exits 1 with SETUP entries for a fixture workspace', async () => {
    const result = await runCli(['workspace', 'check', '--json'], { workspace: root })
    expect(result.exitCode).toBe(1)
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.errors.every(({ code }) => code === 'SETUP')).toBe(true)
  })
})
