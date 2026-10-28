import { chmod, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { HedyError } from './errors.js'
import { rejectionOf } from './test-support/http.js'
import { runLocalTool } from './local-tool.js'

const runNode = (code, options = {}) =>
  runLocalTool({ command: process.execPath, args: ['-e', code], env: {}, ...options })

const isAlive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (error.code === 'ESRCH') return false
    throw error
  }
}

let folder

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'hedy-local-tool-'))
})

afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

describe('runLocalTool', () => {
  it('captures stdout and stderr in full and separately, decoded as UTF-8', async () => {
    const result = await runNode("process.stdout.write('café ✓ out\\n'.repeat(2000)); process.stderr.write('naïve ✗ err')")
    expect(result.stdout).toBe('café ✓ out\n'.repeat(2000))
    expect(result.stderr).toBe('naïve ✗ err')
  })

  it.each([0, 3])('resolves exit %i with that exit code, no signal and no timeout', async (code) => {
    const result = await runNode(`process.exit(${code})`)
    expect(result).toEqual({ exitCode: code, signal: null, stdout: '', stderr: '', timedOut: false })
  })

  it('ends a child that outlives timeoutMs with SIGTERM and resolves timedOut with no exit code, leaving no child running', async () => {
    const result = await runNode('process.stdout.write(String(process.pid)); setInterval(() => {}, 1000)', { timeoutMs: 300 })
    expect(result).toMatchObject({ timedOut: true, exitCode: null, signal: 'SIGTERM' })
    expect(isAlive(Number(result.stdout))).toBe(false)
  })

  it('ends a child that ignores SIGTERM with SIGKILL after killGraceMs, leaving no child running', async () => {
    const result = await runNode(
      "process.on('SIGTERM', () => {}); process.stdout.write(String(process.pid)); setInterval(() => {}, 1000)",
      { timeoutMs: 400, killGraceMs: 200 }
    )
    expect(result).toMatchObject({ timedOut: true, exitCode: null, signal: 'SIGKILL' })
    expect(isAlive(Number(result.stdout))).toBe(false)
  })

  it('refuses a missing executable with USAGE naming the command and the next step', async () => {
    const error = await rejectionOf(runLocalTool({ command: 'hedy-no-such-tool-7d1c', env: { PATH: process.env.PATH } }))
    expect(error).toBeInstanceOf(HedyError)
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe('hedy-no-such-tool-7d1c was not found on PATH. Install hedy-no-such-tool-7d1c, then run the command again.')
  })

  it('refuses any other spawn error with UNKNOWN naming the command, keeping the spawn error as the cause', async () => {
    const command = join(folder, 'not-executable')
    await writeFile(command, '#!/bin/sh\n')
    await chmod(command, 0o600)
    const error = await rejectionOf(runLocalTool({ command, env: {} }))
    expect(error).toBeInstanceOf(HedyError)
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toContain(command)
    expect(error.cause.code).toBe('EACCES')
  })

  it('gives the child exactly env as its environment, with nothing merged from the parent', async () => {
    process.env.HEDY_LOCAL_TOOL_PARENT_ONLY = 'parent'
    try {
      const result = await runNode('process.stdout.write(JSON.stringify(process.env))', { env: { HEDY_LOCAL_TOOL_CHILD: 'child' } })
      const childEnv = JSON.parse(result.stdout)
      expect(childEnv.HEDY_LOCAL_TOOL_CHILD).toBe('child')
      expect(childEnv).not.toHaveProperty('HEDY_LOCAL_TOOL_PARENT_ONLY')
      expect(childEnv).not.toHaveProperty('PATH')
    } finally {
      delete process.env.HEDY_LOCAL_TOOL_PARENT_ONLY
    }
  })

  it('runs the child in cwd', async () => {
    const result = await runNode('process.stdout.write(process.cwd())', { cwd: folder })
    expect(await realpath(result.stdout)).toBe(await realpath(folder))
  })

  it('passes each chunk to onOutput with its stream name, in arrival order', async () => {
    const chunks = []
    await runNode(
      "process.stdout.write('first'); setTimeout(() => { process.stderr.write('second'); setTimeout(() => process.stdout.write('third'), 50) }, 50)",
      { onOutput: (output) => { chunks.push(output) } }
    )
    expect(chunks).toEqual([
      { stream: 'stdout', chunk: 'first' },
      { stream: 'stderr', chunk: 'second' },
      { stream: 'stdout', chunk: 'third' }
    ])
  })
})
