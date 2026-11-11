import { rm } from 'node:fs/promises'
import { Command } from 'commander'
import nock from 'nock'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createWorkspace, runCli } from '../../test-support/cli.js'
import {
  ATLASSIAN_BASE_URL,
  TEST_CREDENTIALS,
  credentialsEnv,
  interceptNetworkPerTest,
  readJsonFixture,
  rejectionOf
} from '../../test-support/http.js'
import { captureIo } from '../../test-support/io.js'
import { register, runSearch } from './search.js'

interceptNetworkPerTest()

const searchResponse = await readJsonFixture(new URL('../../clients/__fixtures__/jira-search-response.json', import.meta.url))
const searchProjection = await readJsonFixture(new URL('../../clients/__fixtures__/jira-search-projection.json', import.meta.url))

const SEARCH = '/rest/api/2/search/jql'

const stageSearch = (query, body) => nock(ATLASSIAN_BASE_URL).get(SEARCH).query(query).reply(200, body)

let root

beforeEach(async () => {
  root = await createWorkspace()
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('runSearch', () => {
  it('returns the issues the query matches as the search projection', async () => {
    stageSearch(true, searchResponse)
    expect(await runSearch({ jql: 'project = HEDY', max: 200, env: credentialsEnv(), workspaceRoot: () => root }))
      .toEqual({ issues: searchProjection, truncated: false })
  })

  it('throws AUTH naming the missing variables and sends no request when the credentials are incomplete', async () => {
    const error = await rejectionOf(runSearch({ jql: 'project = HEDY', max: 200, env: { JIRA_USER: TEST_CREDENTIALS.user }, workspaceRoot: () => root }))
    expect(error.code).toBe('AUTH')
    expect(error.message).toContain('JIRA_TOKEN and JIRA_BASE_URL are not set')
  })
})

const harness = () => {
  const io = captureIo()
  const program = new Command().option('--json').exitOverride()
  register(program, { ...io, env: credentialsEnv(), workspaceRoot: () => root })
  return { program, ...io }
}

describe('the jira search command', () => {
  it('in text mode prints one line per issue with the key, the status and the summary, none for a missing status', async () => {
    const issues = searchResponse.issues.map((issue, index) =>
      index === 1 ? { ...issue, fields: { ...issue.fields, status: null } } : issue)
    stageSearch(true, { ...searchResponse, issues })
    const h = harness()
    await h.program.parseAsync(['search', 'project = HEDY'], { from: 'user' })
    expect(h.out.join('')).toBe([
      'HEDY-101  In Progress  Capture the read projections as fixtures',
      'HEDY-102  none  Write the markdown converter tests',
      'HEDY-103  Done  Review the search pagination & the "max" cap',
      ''
    ].join('\n'))
    expect(h.codes).toEqual([0])
  })

  it('in text mode prints one sentence when no issue matches the query', async () => {
    stageSearch(true, { issues: [], isLast: true })
    const h = harness()
    await h.program.parseAsync(['search', 'project = NONE'], { from: 'user' })
    expect(h.out.join('')).toBe('No issues match the query.\n')
  })

  it('asks Jira for 200 issues at most, 100 a page, when --max is not given', async () => {
    stageSearch((query) => query.maxResults === '100' && query.jql === 'project = HEDY', searchResponse)
    const h = harness()
    await h.program.parseAsync(['search', 'project = HEDY', '--json'], { from: 'user' })
    expect(JSON.parse(h.out[0]).result.issues).toHaveLength(3)
  })

  it('takes --max as a number and returns no more issues than it allows', async () => {
    stageSearch((query) => query.maxResults === '2', searchResponse)
    const h = harness()
    await h.program.parseAsync(['search', 'project = HEDY', '--max', '2', '--json'], { from: 'user' })
    expect(JSON.parse(h.out[0]).result.issues.map(({ key }) => key)).toEqual(['HEDY-101', 'HEDY-102'])
  })

  it.each([
    ['text', []],
    ['json', ['--json']]
  ])('in %s mode writes one stderr note naming --max when Jira offers more issues than --max allows', async (_mode, modeArgs) => {
    stageSearch((query) => query.maxResults === '2', { ...searchResponse, nextPageToken: 'page-2' })
    const h = harness()
    await h.program.parseAsync(['search', 'project = HEDY', '--max', '2', ...modeArgs], { from: 'user' })
    expect(h.err).toEqual(['Stopped at --max 2. More issues match the query. Raise --max to read them.\n'])
    expect(h.out).toHaveLength(1)
    expect(h.out[0]).not.toContain('Stopped at')
    expect(h.codes).toEqual([0])
  })

  it.each([
    ['text', []],
    ['json', ['--json']]
  ])('in %s mode writes nothing on stderr when every matching issue fits within --max', async (_mode, modeArgs) => {
    stageSearch(true, searchResponse)
    const h = harness()
    await h.program.parseAsync(['search', 'project = HEDY', ...modeArgs], { from: 'user' })
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([0])
  })

  it.each([
    [true, { ...searchResponse, nextPageToken: 'page-2' }],
    [false, searchResponse]
  ])('gives result.truncated %s in the envelope', async (truncated, body) => {
    stageSearch((query) => query.maxResults === '2', body)
    const h = harness()
    await h.program.parseAsync(['search', 'project = HEDY', '--max', '2', '--json'], { from: 'user' })
    expect(JSON.parse(h.out[0]).result.truncated).toBe(truncated)
  })

  it.each([
    ['--max that is not a number', ['search', 'project = HEDY', '--max', 'ten'], '--max must be a whole number greater than 0. Run the command again with a value such as 50.'],
    ['--max that is a fraction', ['search', 'project = HEDY', '--max', '1.5'], '--max must be a whole number greater than 0. Run the command again with a value such as 50.'],
    ['a blank query', ['search', '  '], 'The JQL query is empty. Give a query such as "project = ABC", then run the command again.']
  ])('refuses %s with one USAGE line, exit 2 and no request', async (_label, args, message) => {
    const h = harness()
    await h.program.parseAsync(args, { from: 'user' })
    expect(h.out).toEqual([])
    expect(h.err).toEqual([`${message}\n`])
    expect(h.codes).toEqual([2])
  })
})

describe('hedy jira search, spawned', () => {
  it('with --max 0 gives one USAGE entry naming --max and no AUTH entry, so no .env was read, and exits 2', async () => {
    const result = await runCli(['jira', 'search', 'project = X', '--max', '0', '--json'], {
      env: { HEDY_WORKSPACE: root, JIRA_USER: undefined, JIRA_TOKEN: undefined, JIRA_BASE_URL: undefined }
    })
    expect(result.exitCode).toBe(2)
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.errors.map(({ code }) => code)).toEqual(['USAGE'])
    expect(result.envelope.errors[0].message).toContain('--max')
  })
})
