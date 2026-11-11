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

describe('the jira group', () => {
  it('lists the ticket, search, create and describe commands in its help and describes the group as reading and writing Jira issues', async () => {
    const h = harness()
    const error = await rejectionOf(h.program.parseAsync(['jira', '--help'], { from: 'user' }))
    expect(error.code).toBe('commander.helpDisplayed')
    const help = h.out.join('')
    expect(help).toMatch(/^ {2}ticket <key>\s/m)
    expect(help).toMatch(/^ {2}search \[options\] <jql>\s/m)
    expect(help).toMatch(/^ {2}create \[options\]\s/m)
    expect(help).toMatch(/^ {2}describe \[options\] <key>\s/m)
    expect(help).toContain('Read and write Jira issues')
  })

  it.each([
    [['jira', 'ticket', 'HEDY_101'], 'The key HEDY_101 is not a Jira issue key'],
    [['jira', 'search', 'project = HEDY', '--max', '0'], '--max must be a whole number'],
    [['jira', 'create', '--from', ''], '--from is empty'],
    [['jira', 'describe', 'HEDY_101', '--from', 'x'], 'The key HEDY_101 is not a Jira issue key']
  ])('routes %j to its command, which refuses the input with exit 2', async (args, message) => {
    const h = harness()
    await h.program.parseAsync(args, { from: 'user' })
    expect(h.err.join('')).toContain(message)
    expect(h.codes).toEqual([2])
  })
})

describe('hedy jira --help, spawned', () => {
  it('lists the ticket, search, create and describe commands and exits 0', async () => {
    const result = await runCli(['jira', '--help'], { env: { HEDY_WORKSPACE: root } })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/^ {2}ticket <key>\s/m)
    expect(result.stdout).toMatch(/^ {2}search \[options\] <jql>\s/m)
    expect(result.stdout).toMatch(/^ {2}create \[options\]\s/m)
    expect(result.stdout).toMatch(/^ {2}describe \[options\] <key>\s/m)
  })
})
