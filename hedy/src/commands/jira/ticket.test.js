import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Command } from 'commander'
import nock from 'nock'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createWorkspace, runCli } from '../../test-support/cli.js'
import {
  ATLASSIAN_BASE_URL,
  TEST_CREDENTIALS,
  basicAuthorizationFor,
  credentialsEnv,
  interceptNetworkPerTest,
  readJsonFixture,
  rejectionOf,
  startAnsweringServer
} from '../../test-support/http.js'
import { captureIo } from '../../test-support/io.js'
import { register, runTicket, ticketRows } from './ticket.js'

interceptNetworkPerTest()

const issueResponse = await readJsonFixture(new URL('../../clients/__fixtures__/jira-issue-response.json', import.meta.url))
const [issueProjection, bareIssueProjection] = await readJsonFixture(new URL('../../clients/__fixtures__/jira-search-projection.json', import.meta.url))

const stageIssue = (body) => nock(ATLASSIAN_BASE_URL).get('/rest/api/2/issue/HEDY-101').query(true).reply(200, body)

let root

beforeEach(async () => {
  root = await createWorkspace()
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('runTicket', () => {
  it('returns the issue projection with the description as wiki markup', async () => {
    stageIssue(issueResponse)
    expect(await runTicket({ key: 'HEDY-101', env: credentialsEnv(), workspaceRoot: () => root })).toEqual({
      ...issueProjection,
      description: issueResponse.fields.description
    })
  })

  it('throws AUTH naming the missing variables and sends no request when the credentials are incomplete', async () => {
    const error = await rejectionOf(runTicket({ key: 'HEDY-101', env: { JIRA_USER: TEST_CREDENTIALS.user }, workspaceRoot: () => root }))
    expect(error.code).toBe('AUTH')
    expect(error.message).toContain('JIRA_TOKEN and JIRA_BASE_URL are not set')
  })
})

describe('ticketRows', () => {
  it('gives the nine labelled rows for the issue fixture with the labels joined by commas', () => {
    expect(ticketRows(issueProjection)).toEqual([
      ['Status', 'In Progress'],
      ['Type', 'Task'],
      ['Priority', 'Medium'],
      ['Assignee', 'Ada Lovelace'],
      ['Labels', 'fixtures, hedy'],
      ['Parent', 'HEDY-100'],
      ['Created', '2026-10-01T09:15:30.000+0000'],
      ['Updated', '2026-10-05T16:42:08.000+0000'],
      ['URL', 'https://example.atlassian.net/browse/HEDY-101']
    ])
  })

  it('gives none for each null value and the empty label list', () => {
    expect(ticketRows(bareIssueProjection)).toEqual([
      ['Status', 'To Do'],
      ['Type', 'Story'],
      ['Priority', 'none'],
      ['Assignee', 'none'],
      ['Labels', 'none'],
      ['Parent', 'none'],
      ['Created', '2026-10-02T11:00:00.000+0000'],
      ['Updated', '2026-10-02T11:00:00.000+0000'],
      ['URL', 'https://example.atlassian.net/browse/HEDY-102']
    ])
  })
})

const harness = () => {
  const io = captureIo()
  const program = new Command().option('--json').exitOverride()
  register(program, { ...io, env: credentialsEnv(), workspaceRoot: () => root })
  return { program, ...io }
}

describe('the jira ticket command', () => {
  it('in text mode prints the key and summary, one aligned line per field, a blank line and the description', async () => {
    stageIssue(issueResponse)
    const h = harness()
    await h.program.parseAsync(['ticket', 'HEDY-101'], { from: 'user' })
    expect(h.out.join('')).toBe([
      'HEDY-101  Capture the read projections as fixtures',
      'Status:   In Progress',
      'Type:     Task',
      'Priority: Medium',
      'Assignee: Ada Lovelace',
      'Labels:   fixtures, hedy',
      'Parent:   HEDY-100',
      'Created:  2026-10-01T09:15:30.000+0000',
      'Updated:  2026-10-05T16:42:08.000+0000',
      'URL:      https://example.atlassian.net/browse/HEDY-101',
      '',
      `${issueResponse.fields.description}\n`
    ].join('\n'))
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([0])
  })

  it('in text mode writes none for each empty field and (no description) for a missing description', async () => {
    stageIssue({ key: 'HEDY-101', fields: { summary: 'Bare issue', labels: [], description: null } })
    const h = harness()
    await h.program.parseAsync(['ticket', 'HEDY-101'], { from: 'user' })
    expect(h.out.join('')).toBe([
      'HEDY-101  Bare issue',
      'Status:   none',
      'Type:     none',
      'Priority: none',
      'Assignee: none',
      'Labels:   none',
      'Parent:   none',
      'Created:  none',
      'Updated:  none',
      'URL:      https://example.atlassian.net/browse/HEDY-101',
      '',
      '(no description)\n'
    ].join('\n'))
  })

  it('refuses a key that is not a Jira issue key with one USAGE line naming the key, exit 2 and no request', async () => {
    const h = harness()
    await h.program.parseAsync(['ticket', 'HEDY_101'], { from: 'user' })
    expect(h.out).toEqual([])
    expect(h.err).toEqual(['The key HEDY_101 is not a Jira issue key such as ABC-123. Give the key of one issue, then run the command again.\n'])
    expect(h.codes).toEqual([2])
  })
})

describe('hedy jira ticket, spawned', () => {
  const childEnv = () => ({ HEDY_WORKSPACE: root, JIRA_USER: undefined, JIRA_TOKEN: undefined, JIRA_BASE_URL: undefined })

  it.each([
    ['with no key', ['jira', 'ticket', '--json'], "The command needs the argument 'key'."],
    ['with a key of the wrong shape', ['jira', 'ticket', 'not-a-key', '--json'], 'The key not-a-key is not a Jira issue key such as ABC-123.']
  ])('%s gives one USAGE entry and no AUTH entry, so no .env was read, and exits 2', async (_label, args, message) => {
    const result = await runCli(args, { env: childEnv() })
    expect(result.exitCode).toBe(2)
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.errors.map(({ code }) => code)).toEqual(['USAGE'])
    expect(result.envelope.errors[0].message).toContain(message)
  })

  it('HEDY-101 --json returns the projection with the description and sends the .env credentials', async () => {
    const server = await startAnsweringServer(() => ({ status: 200, body: issueResponse }))
    try {
      await writeFile(join(root, '.env'), `JIRA_USER=file-user\nJIRA_TOKEN=file-token\nJIRA_BASE_URL=${server.baseUrl}\n`)
      const result = await runCli(['jira', 'ticket', 'HEDY-101', '--json'], { env: childEnv() })
      expect(result.exitCode).toBe(0)
      expect(result.envelope.ok).toBe(true)
      expect(result.envelope.result).toEqual({
        ...issueProjection,
        url: `${server.baseUrl}/browse/HEDY-101`,
        description: issueResponse.fields.description
      })
      expect(server.requests.map(({ url, authorization }) => ({ path: url.split('?')[0], authorization }))).toEqual([
        { path: '/rest/api/2/issue/HEDY-101', authorization: basicAuthorizationFor('file-user', 'file-token') }
      ])
    } finally {
      await server.close()
    }
  })
})
