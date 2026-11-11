import { readFile, rm } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { afterAll, describe, it, expect } from 'vitest'
import { createWorkspace, runCli } from '../../test-support/cli.js'
import { rejectionOf } from '../../test-support/http.js'
import { captureIo } from '../../test-support/io.js'
import { register } from './index.js'
import { LANGUAGE_FILE } from './language-file.js'

const languageFixture = await readFile(new URL('./__fixtures__/tables/language.md', import.meta.url), 'utf8')
const FIXTURE_WORKSPACE = await createWorkspace({ files: { [LANGUAGE_FILE]: languageFixture } })
afterAll(() => rm(FIXTURE_WORKSPACE, { recursive: true, force: true }))

const harness = () => {
  const io = captureIo()
  const program = new Command()
    .option('--json')
    .exitOverride()
    .configureOutput({ writeOut: (chunk) => io.stdout.write(chunk), writeErr: () => {} })
  register(program, { ...io, stdin: Readable.from(['']), workspaceRoot: () => FIXTURE_WORKSPACE })
  return { program, ...io }
}

describe('the prose group', () => {
  it('lists the check command in its help and describes the group as checking prose against the house language file', async () => {
    const h = harness()
    const error = await rejectionOf(h.program.parseAsync(['prose', '--help'], { from: 'user' }))
    expect(error.code).toBe('commander.helpDisplayed')
    const help = h.out.join('')
    expect(help).toMatch(/^ {2}check \[options\] \[files\.\.\.\]\s/m)
    expect(help).toContain('Check prose against the house language file')
  })

  it('routes prose check with no input to the check command, which refuses the call with exit 2', async () => {
    const h = harness()
    await h.program.parseAsync(['prose', 'check'], { from: 'user' })
    expect(h.err.join('')).toContain('No text was given to check.')
    expect(h.codes).toEqual([2])
  })

  it('routes prose check on a clean page to the check command, which prints passed and exits 0', async () => {
    const h = harness()
    await h.program.parseAsync(['prose', 'check', fileURLToPath(new URL('./__fixtures__/pages/clean.md', import.meta.url))], { from: 'user' })
    expect(h.out).toEqual(['passed\n'])
    expect(h.codes).toEqual([0])
  })
})

describe('hedy prose --help, spawned', () => {
  it('lists the check command and exits 0', async () => {
    const result = await runCli(['prose', '--help'], { workspace: FIXTURE_WORKSPACE })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/^ {2}check \[options\] \[files\.\.\.\]\s/m)
  })
})
