import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Command } from 'commander'
import nock from 'nock'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createWorkspace, runCli } from '../../test-support/cli.js'
import {
  ATLASSIAN_BASE_URL,
  basicAuthorizationFor,
  credentialsEnv,
  interceptNetworkPerTest,
  readJsonFixture,
  rejectionOf,
  startAnsweringServer
} from '../../test-support/http.js'
import { captureIo } from '../../test-support/io.js'
import { register, runDescribe } from './describe.js'
import { planIdOf } from './plan.js'

interceptNetworkPerTest()

const fixturesUrl = new URL('./__fixtures__/', import.meta.url)
const describeRequest = await readJsonFixture(new URL('describe-request.json', fixturesUrl))
const issueResponse = await readJsonFixture(new URL('../../clients/__fixtures__/jira-issue-response.json', import.meta.url))
const revisedDescription = (await readFile(new URL('description-revised.jira.txt', fixturesUrl), 'utf8')).replace(/\n+$/, '')
const updateDescriptionOutput = await readFile(new URL('update-description-output.txt', fixturesUrl), 'utf8')

const ISSUE_DESCRIPTION = issueResponse.fields.description
const ISSUE_URL = 'https://example.atlassian.net/browse/HEDY-101'

let root
let folder
let descriptionPath

beforeEach(async () => {
  root = await createWorkspace()
  folder = await mkdtemp(join(tmpdir(), 'hedy-describe-'))
  descriptionPath = join(folder, 'description-revised.jira.txt')
  await copyFile(new URL('description-revised.jira.txt', fixturesUrl), descriptionPath)
})

afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
  await rm(root, { recursive: true, force: true })
})

const stageIssue = (description, key = 'HEDY-101') => nock(ATLASSIAN_BASE_URL)
  .get(`/rest/api/2/issue/${key}`)
  .query(true)
  .reply(200, { ...issueResponse, key, fields: { ...issueResponse.fields, description } })

const stageUpdate = (key = 'HEDY-101') => nock(ATLASSIAN_BASE_URL).put(`/rest/api/2/issue/${key}`, describeRequest).reply(204)

const describeIssue = (confirm) =>
  runDescribe({ key: 'HEDY-101', from: descriptionPath, confirm, env: credentialsEnv(), workspaceRoot: () => root })

const planIdAgainstIssue = planIdOf({ key: 'HEDY-101', description: revisedDescription, currentDescription: ISSUE_DESCRIPTION })

describe('runDescribe', () => {
  it('without confirm reads the issue once and returns the dry run, not unchanged, for the revised description', async () => {
    stageIssue(ISSUE_DESCRIPTION)
    expect(await describeIssue()).toEqual({
      mode: 'dry-run',
      planId: planIdAgainstIssue,
      key: 'HEDY-101',
      url: ISSUE_URL,
      description: revisedDescription,
      unchanged: false
    })
  })

  it('without confirm returns unchanged true when the file holds the description the issue already has', async () => {
    await writeFile(descriptionPath, `${ISSUE_DESCRIPTION}\n`)
    stageIssue(ISSUE_DESCRIPTION)
    expect(await describeIssue()).toMatchObject({ mode: 'dry-run', description: ISSUE_DESCRIPTION, unchanged: true })
  })

  it('refuses a missing description file with USAGE before reading credentials or sending a request', async () => {
    const error = await rejectionOf(runDescribe({ key: 'HEDY-101', from: join(folder, 'missing.txt'), env: {}, workspaceRoot: () => root }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toContain(join(folder, 'missing.txt'))
  })

  it('refuses a confirm with USAGE and sends no update when the issue description changed on the server after the dry run', async () => {
    stageIssue('h3. Edited on the server')
    const error = await rejectionOf(describeIssue(planIdAgainstIssue))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe('The plan has changed since the dry run. Run the dry run again, then confirm the new plan id.')
  })

  it('with the matching confirm reads the issue, sends the captured update body, reads the issue back and returns updated', async () => {
    stageIssue(ISSUE_DESCRIPTION)
    stageUpdate()
    stageIssue(revisedDescription)
    expect(await describeIssue(planIdAgainstIssue)).toEqual({ mode: 'updated', key: 'HEDY-101', url: ISSUE_URL })
  })

  it('rejects with UNKNOWN naming the key when the read back still holds the old description', async () => {
    stageIssue(ISSUE_DESCRIPTION)
    stageUpdate()
    stageIssue(ISSUE_DESCRIPTION)
    const error = await rejectionOf(describeIssue(planIdAgainstIssue))
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toBe('describe HEDY-101: Jira did not store the description sent. Read the issue with hedy jira ticket HEDY-101, then run the command again.')
  })

  it('on a second matching confirm reads the issue once, sends no update and returns unchanged', async () => {
    stageIssue(revisedDescription)
    expect(await describeIssue(planIdAgainstIssue)).toEqual({ mode: 'unchanged', key: 'HEDY-101', url: ISSUE_URL })
  })
})

const harness = () => {
  const io = captureIo()
  const program = new Command().option('--json').exitOverride()
  register(program, { ...io, env: credentialsEnv(), workspaceRoot: () => root })
  return { program, ...io }
}

describe('the jira describe command', () => {
  it.each([
    ['a plan id that is not 64 hex characters', ['HEDY-101', '--from', '/nonexistent/description.txt', '--confirm', 'abc'], 'The plan id abc is not one a dry run printed. Run the dry run, then confirm the 64-character plan id it prints.'],
    ['a key that is not a Jira issue key', ['HEDY_101', '--from', '/nonexistent/description.txt'], 'The key HEDY_101 is not a Jira issue key such as ABC-123. Give the key of one issue, then run the command again.'],
    ['a missing --from', ['HEDY-101'], '--from is missing. Give --from the path of the description file, then run the command again.'],
    ['an empty --from', ['HEDY-101', '--from', ''], '--from is empty. Give --from the path of the description file, then run the command again.']
  ])('refuses %s with one USAGE line before reading any file, exit 2', async (_label, args, message) => {
    const h = harness()
    await h.program.parseAsync(['describe', ...args], { from: 'user' })
    expect(h.out).toEqual([])
    expect(h.err).toEqual([`${message}\n`])
    expect(h.codes).toEqual([2])
  })

  it('in text mode prints one aligned line per plan field, the description and the confirm step for a dry run', async () => {
    stageIssue(ISSUE_DESCRIPTION)
    const h = harness()
    await h.program.parseAsync(['describe', 'HEDY-101', '--from', descriptionPath], { from: 'user' })
    expect(h.out.join('')).toBe([
      `Plan id:   ${planIdAgainstIssue}`,
      'Issue:     HEDY-101',
      `URL:       ${ISSUE_URL}`,
      'Unchanged: no',
      '',
      revisedDescription,
      '',
      `This is a dry run. Nothing was sent. Run the command again with --confirm ${planIdAgainstIssue} to replace the description.\n`
    ].join('\n'))
    expect(h.codes).toEqual([0])
  })

  it('in text mode prints the two lines the bash tool printed for a confirmed update', async () => {
    const planId = planIdOf({ key: 'HEDY-201', description: revisedDescription, currentDescription: ISSUE_DESCRIPTION })
    stageIssue(ISSUE_DESCRIPTION, 'HEDY-201')
    stageUpdate('HEDY-201')
    stageIssue(revisedDescription, 'HEDY-201')
    const h = harness()
    await h.program.parseAsync(['describe', 'HEDY-201', '--from', descriptionPath, '--confirm', planId], { from: 'user' })
    expect(h.out.join('')).toBe(updateDescriptionOutput)
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([0])
  })
})

describe('hedy jira describe, spawned', () => {
  const childEnv = () => ({ HEDY_WORKSPACE: root, JIRA_USER: undefined, JIRA_TOKEN: undefined, JIRA_BASE_URL: undefined })

  it.each([
    ['with no key', ['jira', 'describe', '--json'], "'key'"],
    ['with a key and no --from', ['jira', 'describe', 'HEDY-101', '--json'], '--from']
  ])('%s gives one USAGE entry naming %s and exits 2', async (_label, args, fragment) => {
    const result = await runCli(args, { env: childEnv() })
    expect(result.exitCode).toBe(2)
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.errors.map(({ code }) => code)).toEqual(['USAGE'])
    expect(result.envelope.errors[0].message).toContain(fragment)
  })

  it('HEDY-101 --from a file --json returns the dry run after one GET with the .env credentials', async () => {
    const server = await startAnsweringServer(() => ({ status: 200, body: issueResponse }))
    try {
      await writeFile(join(root, '.env'), `JIRA_USER=file-user\nJIRA_TOKEN=file-token\nJIRA_BASE_URL=${server.baseUrl}\n`)
      const result = await runCli(['jira', 'describe', 'HEDY-101', '--from', descriptionPath, '--json'], { env: childEnv() })
      expect(result.exitCode).toBe(0)
      expect(result.envelope.ok).toBe(true)
      expect(result.envelope.result.mode).toBe('dry-run')
      expect(server.requests.map(({ url, authorization }) => ({ path: url.split('?')[0], authorization }))).toEqual([
        { path: '/rest/api/2/issue/HEDY-101', authorization: basicAuthorizationFor('file-user', 'file-token') }
      ])
    } finally {
      await server.close()
    }
  })
})
