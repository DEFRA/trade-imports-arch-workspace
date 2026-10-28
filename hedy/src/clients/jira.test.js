import nock from 'nock'
import { describe, it, expect } from 'vitest'
import {
  ATLASSIAN_BASE_URL,
  FAILURE_REPLIES,
  TEST_AUTHORIZATION,
  TEST_CREDENTIALS,
  interceptNetworkPerTest,
  printedError,
  readJsonFixture,
  rejectionOf,
  startSilentServer
} from '../test-support/http.js'
import { createJiraClient } from './jira.js'

interceptNetworkPerTest()

const createRequest = await readJsonFixture(new URL('../commands/jira/__fixtures__/create-request.json', import.meta.url))
const createResponse = await readJsonFixture(new URL('./__fixtures__/jira-create-response.json', import.meta.url))
const describeRequest = await readJsonFixture(new URL('../commands/jira/__fixtures__/describe-request.json', import.meta.url))
const issueResponse = await readJsonFixture(new URL('./__fixtures__/jira-issue-response.json', import.meta.url))
const searchProjection = await readJsonFixture(new URL('./__fixtures__/jira-search-projection.json', import.meta.url))
const searchResponse = await readJsonFixture(new URL('./__fixtures__/jira-search-response.json', import.meta.url))

const MYSELF = '/rest/api/2/myself'

describe('the Jira client whoami', () => {
  it('returns only the display name from /rest/api/2/myself, sending the Basic header for the user and token', async () => {
    nock(ATLASSIAN_BASE_URL)
      .matchHeader('authorization', TEST_AUTHORIZATION)
      .get(MYSELF)
      .reply(200, { accountId: '557058:0a1b', displayName: 'Ada Lovelace', emailAddress: 'ada@example.com' })
    expect(await createJiraClient(TEST_CREDENTIALS).whoami()).toEqual({ displayName: 'Ada Lovelace' })
  })

  it('returns a null display name when Jira gives none', async () => {
    nock(ATLASSIAN_BASE_URL).get(MYSELF).reply(200, { accountId: '557058:0a1b' })
    expect(await createJiraClient(TEST_CREDENTIALS).whoami()).toEqual({ displayName: null })
  })

  it('drops a trailing slash from the base URL', async () => {
    nock(ATLASSIAN_BASE_URL).get(MYSELF).reply(200, { displayName: 'Ada Lovelace' })
    const client = createJiraClient({ ...TEST_CREDENTIALS, baseUrl: `${ATLASSIAN_BASE_URL}/` })
    expect(await client.whoami()).toEqual({ displayName: 'Ada Lovelace' })
  })

  it('rejects with NETWORK when Jira does not answer within the timeoutMs given', async () => {
    const server = await startSilentServer()
    const client = createJiraClient({ ...TEST_CREDENTIALS, baseUrl: server.baseUrl }, { timeoutMs: 50 })
    const error = await rejectionOf(client.whoami()).finally(server.close)
    expect(error).toMatchObject({ name: 'HedyError', code: 'NETWORK', message: expect.stringMatching(/^whoami: Jira did not answer within 0\.05 seconds\. /) })
  })

  it.each(FAILURE_REPLIES)('on %s rejects with %s, naming Jira and whoami and holding neither the user nor the token', async (_label, code, reply, fragments) => {
    reply(nock(ATLASSIAN_BASE_URL).get(MYSELF))
    const error = await rejectionOf(createJiraClient(TEST_CREDENTIALS).whoami())
    expect(error).toMatchObject({ name: 'HedyError', code, message: expect.stringMatching(/^whoami: Jira /) })
    for (const fragment of fragments) expect(error.message).toContain(fragment)
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.token)
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.user)
  })
})

const SEARCH = '/rest/api/2/search/jql'
const SEARCH_FIELDS = 'summary,status,issuetype,priority,assignee,labels,parent,created,updated'
const JQL = 'project = HEDY ORDER BY key'

const searchQuery = (maxResults, nextPageToken) => ({
  jql: JQL,
  fields: SEARCH_FIELDS,
  maxResults: String(maxResults),
  ...(nextPageToken ? { nextPageToken } : {})
})

const stageSearchPage = (query, body) => nock(ATLASSIAN_BASE_URL).get(SEARCH).query(query).reply(200, body)

describe('the Jira client issue', () => {
  it('returns the search projection plus the description from /rest/api/2/issue/<key>, asking for those fields with the Basic header', async () => {
    nock(ATLASSIAN_BASE_URL)
      .matchHeader('authorization', TEST_AUTHORIZATION)
      .get('/rest/api/2/issue/HEDY-101')
      .query({ fields: `${SEARCH_FIELDS},description` })
      .reply(200, issueResponse)
    const issue = await createJiraClient(TEST_CREDENTIALS).issue('HEDY-101')
    expect(issue).toEqual({ ...searchProjection[0], description: issueResponse.fields.description })
    expect(Object.keys(issue)).toEqual([...Object.keys(searchProjection[0]), 'description'])
  })

  it('gives a null description, empty labels and null for every other absent field', async () => {
    nock(ATLASSIAN_BASE_URL).get('/rest/api/2/issue/HEDY-102').query(true).reply(200, { key: 'HEDY-102', fields: {} })
    expect(await createJiraClient(TEST_CREDENTIALS).issue('HEDY-102')).toEqual({
      key: 'HEDY-102',
      url: `${ATLASSIAN_BASE_URL}/browse/HEDY-102`,
      summary: null,
      status: null,
      type: null,
      priority: null,
      assignee: null,
      labels: [],
      parent: null,
      created: null,
      updated: null,
      description: null
    })
  })

  it('builds the url without a double slash when the base URL ends in a slash', async () => {
    nock(ATLASSIAN_BASE_URL).get('/rest/api/2/issue/HEDY-101').query(true).reply(200, issueResponse)
    const client = createJiraClient({ ...TEST_CREDENTIALS, baseUrl: `${ATLASSIAN_BASE_URL}/` })
    expect((await client.issue('HEDY-101')).url).toBe(`${ATLASSIAN_BASE_URL}/browse/HEDY-101`)
  })

  it('encodes the key into the path', async () => {
    nock(ATLASSIAN_BASE_URL).get('/rest/api/2/issue/HEDY%2F1%3F').query(true).reply(200, issueResponse)
    expect((await createJiraClient(TEST_CREDENTIALS).issue('HEDY/1?')).key).toBe('HEDY-101')
  })

  it('rejects a 404 with NOT_FOUND, naming the key in the action', async () => {
    nock(ATLASSIAN_BASE_URL).get('/rest/api/2/issue/HEDY-404').query(true).reply(404, { errorMessages: ['Issue does not exist.'] })
    const error = await rejectionOf(createJiraClient(TEST_CREDENTIALS).issue('HEDY-404'))
    expect(error).toMatchObject({ name: 'HedyError', code: 'NOT_FOUND', message: expect.stringMatching(/^issue HEDY-404: Jira found nothing/) })
  })
})

describe('the Jira client search', () => {
  it('returns the captured projection as issues and truncated false for one page, sending the Basic header', async () => {
    nock(ATLASSIAN_BASE_URL)
      .matchHeader('authorization', TEST_AUTHORIZATION)
      .get(SEARCH)
      .query(searchQuery(100))
      .reply(200, searchResponse)
    const result = await createJiraClient(TEST_CREDENTIALS).search(JQL, { max: 200 })
    expect(result).toEqual({ issues: searchProjection, truncated: false })
    expect(result.issues.map(Object.keys)).toEqual(searchProjection.map(Object.keys))
  })

  it.each([
    [200, 100],
    [5, 5]
  ])('for max %i asks for maxResults %i on the first page', async (max, maxResults) => {
    stageSearchPage(searchQuery(maxResults), searchResponse)
    expect((await createJiraClient(TEST_CREDENTIALS).search(JQL, { max })).issues).toHaveLength(3)
  })

  it('joins two pages, sending the first page\'s nextPageToken on the second request', async () => {
    stageSearchPage(searchQuery(100), { issues: searchResponse.issues.slice(0, 1), nextPageToken: 'page-2' })
    stageSearchPage(searchQuery(99, 'page-2'), { issues: searchResponse.issues.slice(1) })
    expect(await createJiraClient(TEST_CREDENTIALS).search(JQL, { max: 100 })).toEqual({ issues: searchProjection, truncated: false })
  })

  it('stops after a page without a nextPageToken, with truncated false', async () => {
    stageSearchPage(searchQuery(100), { issues: searchResponse.issues.slice(0, 1), isLast: true })
    expect(await createJiraClient(TEST_CREDENTIALS).search(JQL, { max: 200 })).toEqual({ issues: searchProjection.slice(0, 1), truncated: false })
  })

  it('stops after a page without issues even when the page has a nextPageToken, with truncated false', async () => {
    stageSearchPage(searchQuery(100), { issues: [], nextPageToken: 'page-2' })
    expect(await createJiraClient(TEST_CREDENTIALS).search(JQL, { max: 200 })).toEqual({ issues: [], truncated: false })
  })

  it('gives truncated false when max is reached on a page without a nextPageToken', async () => {
    stageSearchPage(searchQuery(3), { ...searchResponse, isLast: true })
    expect(await createJiraClient(TEST_CREDENTIALS).search(JQL, { max: 3 })).toEqual({ issues: searchProjection, truncated: false })
  })

  it('stops at max while Jira offers another page, returning max issues with truncated true and sending no second request', async () => {
    stageSearchPage(searchQuery(2), { ...searchResponse, nextPageToken: 'page-2' })
    expect(await createJiraClient(TEST_CREDENTIALS).search(JQL, { max: 2 })).toEqual({ issues: searchProjection.slice(0, 2), truncated: true })
  })

  it('asks a later page for only the issues still wanted: maxResults 50 after 100 issues for max 150', async () => {
    const fullPage = Array.from({ length: 100 }, (_, index) => ({ ...searchResponse.issues[1], key: `HEDY-${1000 + index}` }))
    stageSearchPage(searchQuery(100), { issues: fullPage, nextPageToken: 'page-2' })
    stageSearchPage(searchQuery(50, 'page-2'), searchResponse)
    const { issues } = await createJiraClient(TEST_CREDENTIALS).search(JQL, { max: 150 })
    expect(issues).toHaveLength(103)
    expect(issues.slice(100)).toEqual(searchProjection)
  })

  it('builds each url without a double slash when the base URL ends in a slash', async () => {
    stageSearchPage(searchQuery(100), searchResponse)
    const client = createJiraClient({ ...TEST_CREDENTIALS, baseUrl: `${ATLASSIAN_BASE_URL}/` })
    expect((await client.search(JQL, { max: 200 })).issues.map(({ url }) => url)).toEqual(searchProjection.map(({ url }) => url))
  })

  it('rejects a 400 with USAGE carrying Jira\'s message', async () => {
    nock(ATLASSIAN_BASE_URL).get(SEARCH).query(true).reply(400, { errorMessages: ['Error in the JQL Query: the field nope does not exist.'] })
    const error = await rejectionOf(createJiraClient(TEST_CREDENTIALS).search('nope = 1', { max: 10 }))
    expect(error).toMatchObject({
      name: 'HedyError',
      code: 'USAGE',
      message: 'search: Jira refused the request. Jira said "Error in the JQL Query: the field nope does not exist.". Correct the request, then run the command again.'
    })
  })
})

const CREATE = '/rest/api/2/issue'

describe('the Jira client createIssue', () => {
  it('posts the captured request body to /rest/api/2/issue with the Basic header and returns the key and browse url from the captured answer', async () => {
    nock(ATLASSIAN_BASE_URL)
      .matchHeader('authorization', TEST_AUTHORIZATION)
      .post(CREATE, createRequest)
      .reply(201, createResponse)
    expect(await createJiraClient(TEST_CREDENTIALS).createIssue(createRequest.fields)).toEqual({
      key: 'HEDY-201',
      url: 'https://example.atlassian.net/browse/HEDY-201'
    })
  })

  it('builds the url without a double slash when the base URL ends in a slash', async () => {
    nock(ATLASSIAN_BASE_URL).post(CREATE, createRequest).reply(201, createResponse)
    const client = createJiraClient({ ...TEST_CREDENTIALS, baseUrl: `${ATLASSIAN_BASE_URL}/` })
    expect((await client.createIssue(createRequest.fields)).url).toBe(`${ATLASSIAN_BASE_URL}/browse/HEDY-201`)
  })

  it('rejects a 400 with USAGE carrying Jira\'s field reason, naming create in the action', async () => {
    nock(ATLASSIAN_BASE_URL).post(CREATE, createRequest).reply(400, { errorMessages: [], errors: { issuetype: 'Specify a valid issue type.' } })
    const error = await rejectionOf(createJiraClient(TEST_CREDENTIALS).createIssue(createRequest.fields))
    expect(error).toMatchObject({
      name: 'HedyError',
      code: 'USAGE',
      message: 'create: Jira refused the request. Jira said "issuetype: Specify a valid issue type.". Correct the request, then run the command again.'
    })
  })
})

describe('the Jira client updateDescription', () => {
  const description = describeRequest.fields.description

  it('puts the captured request body to /rest/api/2/issue/<key> with the Basic header and resolves to undefined on 204', async () => {
    nock(ATLASSIAN_BASE_URL)
      .matchHeader('authorization', TEST_AUTHORIZATION)
      .put('/rest/api/2/issue/HEDY-201', describeRequest)
      .reply(204)
    expect(await createJiraClient(TEST_CREDENTIALS).updateDescription('HEDY-201', description)).toBeUndefined()
  })

  it('encodes the key into the path', async () => {
    nock(ATLASSIAN_BASE_URL).put('/rest/api/2/issue/HEDY%2F1%3F', describeRequest).reply(204)
    expect(await createJiraClient(TEST_CREDENTIALS).updateDescription('HEDY/1?', description)).toBeUndefined()
  })

  it('rejects a 400 with USAGE carrying Jira\'s field reason, naming the key in the action', async () => {
    nock(ATLASSIAN_BASE_URL).put('/rest/api/2/issue/HEDY-201', describeRequest).reply(400, { errorMessages: [], errors: { description: 'Field cannot be set.' } })
    const error = await rejectionOf(createJiraClient(TEST_CREDENTIALS).updateDescription('HEDY-201', description))
    expect(error).toMatchObject({
      name: 'HedyError',
      code: 'USAGE',
      message: 'describe HEDY-201: Jira refused the request. Jira said "description: Field cannot be set.". Correct the request, then run the command again.'
    })
  })
})
