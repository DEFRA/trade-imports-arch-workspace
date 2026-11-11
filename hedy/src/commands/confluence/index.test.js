import { rm } from 'node:fs/promises'
import { Command } from 'commander'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createWorkspace, runCli } from '../../test-support/cli.js'
import { credentialsEnv, interceptNetworkPerTest, rejectionOf } from '../../test-support/http.js'
import { captureIo } from '../../test-support/io.js'
import { register } from './index.js'

interceptNetworkPerTest()

let root

beforeEach(async () => {
  root = await createWorkspace()
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const harness = () => {
  const io = captureIo()
  const program = new Command()
    .option('--json')
    .exitOverride()
    .configureOutput({ writeOut: (chunk) => io.stdout.write(chunk), writeErr: () => {} })
  register(program, { ...io, env: credentialsEnv(), workspaceRoot: () => root })
  return { program, ...io }
}

describe('the confluence group', () => {
  it('lists the page and publish commands under the read and publish description in its help', async () => {
    const h = harness()
    const error = await rejectionOf(h.program.parseAsync(['confluence', '--help'], { from: 'user' }))
    expect(error.code).toBe('commander.helpDisplayed')
    expect(h.out.join('')).toContain('Read and publish Confluence pages')
    expect(h.out.join('')).toMatch(/^ {2}page \[options\] <reference>\s/m)
    expect(h.out.join('')).toMatch(/^ {2}publish <page>\s/m)
  })

  it('routes confluence page to the page command, which refuses an unknown --format with exit 2', async () => {
    const h = harness()
    await h.program.parseAsync(['confluence', 'page', '123456', '--format', 'pdf'], { from: 'user' })
    expect(h.err.join('')).toContain('--format must be markdown or html.')
    expect(h.codes).toEqual([2])
  })
})

describe('hedy confluence --help, spawned', () => {
  it('lists the page and publish commands and exits 0', async () => {
    const result = await runCli(['--workspace', root, 'confluence', '--help'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/^ {2}page \[options\] <reference>\s/m)
    expect(result.stdout).toMatch(/^ {2}publish <page>\s/m)
  })
})
