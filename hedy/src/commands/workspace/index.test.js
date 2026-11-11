import { rm } from 'node:fs/promises'
import { Command } from 'commander'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createWorkspace, runCli } from '../../test-support/cli.js'
import { rejectionOf } from '../../test-support/http.js'
import { captureIo } from '../../test-support/io.js'
import { register } from './index.js'

let root

beforeEach(async () => {
  root = await createWorkspace()
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('the workspace group', () => {
  it('lists the check command in its help and describes the group as checking the workspace setup', async () => {
    const io = captureIo()
    const program = new Command()
      .exitOverride()
      .configureOutput({ writeOut: (chunk) => io.stdout.write(chunk), writeErr: () => {} })
    register(program, { ...io, env: {}, workspaceRoot: () => root })
    const error = await rejectionOf(program.parseAsync(['workspace', '--help'], { from: 'user' }))
    expect(error.code).toBe('commander.helpDisplayed')
    const help = io.out.join('')
    expect(help).toMatch(/^ {2}check\s/m)
    expect(help).toContain('Check the workspace setup')
  })
})

describe('hedy workspace --help, spawned', () => {
  it('lists the check command and exits 0', async () => {
    const result = await runCli(['workspace', '--help'], { workspace: root })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/^ {2}check\s/m)
  })
})
