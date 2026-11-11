import { rm, stat } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { afterEach, describe, it, expect } from 'vitest'
import { createWorkspace, runCli } from './cli.js'

const created = []

const workspace = async (options) => {
  const root = await createWorkspace(options)
  created.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(created.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('runCli', () => {
  it('returns stdout, stderr, the exit code and the parsed envelope for one JSON line', async () => {
    const root = await workspace()
    const run = await runCli(['hello', '--json'], { env: { HEDY_WORKSPACE: root } })
    expect(run.exitCode).toBe(0)
    expect(run.stderr).toBe('')
    expect(run.envelope.ok).toBe(true)
    expect(run.envelope).toEqual(JSON.parse(run.stdout))
  })

  it('leaves the envelope undefined when stdout is text', async () => {
    const root = await workspace()
    const run = await runCli(['hello'], { env: { HEDY_WORKSPACE: root } })
    expect(run.stdout).toBe('Hello from hedy')
    expect(run.envelope).toBeUndefined()
  })

  it('leaves the envelope undefined when stdout spans several lines', async () => {
    const run = await runCli(['--help'])
    expect(run.stdout.split('\n').length).toBeGreaterThan(1)
    expect(run.envelope).toBeUndefined()
  })

  it('resolves with the exit code instead of rejecting on a failure', async () => {
    const run = await runCli(['--workspace', '/nonexistent', 'hello'])
    expect(run.exitCode).toBe(2)
    expect(run.stdout).toBe('')
  })

  it('passes the given env to the child, so HEDY_WORKSPACE chooses the workspace', async () => {
    const run = await runCli(['hello', '--json'], { env: { HEDY_WORKSPACE: '/nonexistent' } })
    expect(run.exitCode).toBe(2)
    expect(run.envelope.errors[0].message).toContain('/nonexistent, from HEDY_WORKSPACE,')
  })

  it('runs the child in the given cwd, so a relative --workspace resolves there', async () => {
    const root = await workspace()
    const run = await runCli(['--workspace', basename(root), 'hello'], { cwd: dirname(root) })
    expect(run.exitCode).toBe(0)
  })
})

describe('createWorkspace', () => {
  it('creates a temporary folder holding a .claude folder and a Makefile', async () => {
    const root = await workspace()
    expect((await stat(join(root, '.claude'))).isDirectory()).toBe(true)
    expect((await stat(join(root, 'Makefile'))).isFile()).toBe(true)
  })

  it('creates the folder at the given path, leaving out the parts switched off', async () => {
    const parent = await workspace({ claudeFolder: false, makefile: false })
    const root = await createWorkspace({ at: join(parent, 'nested', 'ws'), makefile: false })
    expect(root).toBe(join(parent, 'nested', 'ws'))
    expect((await stat(join(root, '.claude'))).isDirectory()).toBe(true)
    await expect(stat(join(root, 'Makefile'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
