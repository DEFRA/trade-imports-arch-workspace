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
import { createConfluenceClient } from './confluence.js'

interceptNetworkPerTest()

const pageResponse = await readJsonFixture(new URL('./__fixtures__/confluence-page-response.json', import.meta.url))

const CURRENT_USER = '/wiki/rest/api/user/current'

describe('the Confluence client whoami', () => {
  it('returns only the display name from /rest/api/user/current under /wiki, sending the Basic header for the user and token', async () => {
    nock(ATLASSIAN_BASE_URL)
      .matchHeader('authorization', TEST_AUTHORIZATION)
      .get(CURRENT_USER)
      .reply(200, { type: 'known', accountId: '557058:0a1b', displayName: 'Ada Lovelace', email: 'ada@example.com' })
    expect(await createConfluenceClient(TEST_CREDENTIALS).whoami()).toEqual({ displayName: 'Ada Lovelace' })
  })

  it('returns a null display name when Confluence gives none', async () => {
    nock(ATLASSIAN_BASE_URL).get(CURRENT_USER).reply(200, { type: 'known' })
    expect(await createConfluenceClient(TEST_CREDENTIALS).whoami()).toEqual({ displayName: null })
  })

  it('drops a trailing slash from the base URL before adding /wiki', async () => {
    nock(ATLASSIAN_BASE_URL).get(CURRENT_USER).reply(200, { displayName: 'Ada Lovelace' })
    const client = createConfluenceClient({ ...TEST_CREDENTIALS, baseUrl: `${ATLASSIAN_BASE_URL}/` })
    expect(await client.whoami()).toEqual({ displayName: 'Ada Lovelace' })
  })

  it('rejects with AUTH when Confluence answers that the caller is anonymous', async () => {
    nock(ATLASSIAN_BASE_URL).get(CURRENT_USER).reply(200, { type: 'anonymous', displayName: 'Anonymous' })
    const error = await rejectionOf(createConfluenceClient(TEST_CREDENTIALS).whoami())
    expect(error).toMatchObject({
      name: 'HedyError',
      code: 'AUTH',
      message: 'whoami: Confluence treats the credentials as anonymous, so the account has no Confluence access. Check the account\'s Confluence licence, then run the command again.'
    })
  })

  it('rejects with NETWORK when Confluence does not answer within the timeoutMs given', async () => {
    const server = await startSilentServer()
    const client = createConfluenceClient({ ...TEST_CREDENTIALS, baseUrl: server.baseUrl }, { timeoutMs: 50 })
    const error = await rejectionOf(client.whoami()).finally(server.close)
    expect(error).toMatchObject({ name: 'HedyError', code: 'NETWORK', message: expect.stringMatching(/^whoami: Confluence did not answer within 0\.05 seconds\. /) })
  })

  it.each(FAILURE_REPLIES)('on %s rejects with %s, naming Confluence and whoami and holding neither the user nor the token', async (_label, code, reply, fragments) => {
    reply(nock(ATLASSIAN_BASE_URL).get(CURRENT_USER))
    const error = await rejectionOf(createConfluenceClient(TEST_CREDENTIALS).whoami())
    expect(error).toMatchObject({ name: 'HedyError', code, message: expect.stringMatching(/^whoami: Confluence /) })
    for (const fragment of fragments) expect(error.message).toContain(fragment)
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.token)
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.user)
  })
})

const PAGE = '/wiki/rest/api/content/123456'
const PAGE_EXPAND = { expand: 'body.view,version,space,metadata.labels' }

const PAGE_PROJECTION = {
  id: '123456',
  title: 'Synthetic Page for the hedy Fixtures',
  space: 'DOCS',
  version: { number: 4, when: '2026-10-20T10:30:00.000Z', by: 'Ada Lovelace' },
  url: `${ATLASSIAN_BASE_URL}/wiki/spaces/DOCS/pages/123456`,
  labels: ['architecture', 'hedy'],
  body: pageResponse.body.view.value
}

describe('the Confluence client page', () => {
  it('returns the page projection with the HTML body and the label names, asking /wiki/rest/api/content/<id> for those expansions with the Basic header', async () => {
    nock(ATLASSIAN_BASE_URL)
      .matchHeader('authorization', TEST_AUTHORIZATION)
      .get(PAGE)
      .query(PAGE_EXPAND)
      .reply(200, pageResponse)
    const page = await createConfluenceClient(TEST_CREDENTIALS).page('123456')
    expect(page).toEqual(PAGE_PROJECTION)
    expect(Object.keys(page)).toEqual(['id', 'title', 'space', 'version', 'url', 'labels', 'body'])
  })

  it('gives a null version author and empty labels when the page has neither', async () => {
    const { by: _by, ...versionWithoutAuthor } = pageResponse.version
    const { metadata: _metadata, ...pageWithoutLabels } = pageResponse
    nock(ATLASSIAN_BASE_URL).get(PAGE).query(true).reply(200, { ...pageWithoutLabels, version: versionWithoutAuthor })
    expect(await createConfluenceClient(TEST_CREDENTIALS).page('123456')).toEqual({
      ...PAGE_PROJECTION,
      version: { ...PAGE_PROJECTION.version, by: null },
      labels: []
    })
  })

  it('builds the url without a double slash when the base URL ends in a slash', async () => {
    nock(ATLASSIAN_BASE_URL).get(PAGE).query(true).reply(200, pageResponse)
    const client = createConfluenceClient({ ...TEST_CREDENTIALS, baseUrl: `${ATLASSIAN_BASE_URL}/` })
    expect((await client.page('123456')).url).toBe(PAGE_PROJECTION.url)
  })

  it('encodes the id into the path', async () => {
    nock(ATLASSIAN_BASE_URL).get('/wiki/rest/api/content/12%2F34').query(true).reply(200, pageResponse)
    expect((await createConfluenceClient(TEST_CREDENTIALS).page('12/34')).id).toBe('123456')
  })

  it('rejects a 404 with NOT_FOUND, naming the id in the action', async () => {
    nock(ATLASSIAN_BASE_URL).get('/wiki/rest/api/content/999').query(true).reply(404, { message: 'No content found with id 999' })
    const error = await rejectionOf(createConfluenceClient(TEST_CREDENTIALS).page('999'))
    expect(error).toMatchObject({ name: 'HedyError', code: 'NOT_FOUND', message: expect.stringMatching(/^page 999: Confluence found nothing/) })
  })
})

const SHARE_PATH = '/wiki/x/AQAB'
const SHARE_LINK = `${ATLASSIAN_BASE_URL}${SHARE_PATH}`

describe('the Confluence client pageIdFromShortLink', () => {
  it.each([
    ['an absolute', `${ATLASSIAN_BASE_URL}/wiki/spaces/DOCS/pages/123/Title`],
    ['a relative', '/wiki/spaces/DOCS/pages/123/Title']
  ])('returns the page id from %s redirect location, sending the Basic header', async (_label, location) => {
    nock(ATLASSIAN_BASE_URL)
      .matchHeader('authorization', TEST_AUTHORIZATION)
      .get(SHARE_PATH)
      .reply(302, '', { Location: location })
    expect(await createConfluenceClient(TEST_CREDENTIALS).pageIdFromShortLink(SHARE_LINK)).toBe('123')
  })

  it('keeps the link\'s query string on the request', async () => {
    nock(ATLASSIAN_BASE_URL).get(SHARE_PATH).query({ atlOrigin: 'abc' }).reply(302, '', { Location: '/wiki/spaces/DOCS/pages/123' })
    expect(await createConfluenceClient(TEST_CREDENTIALS).pageIdFromShortLink(`${SHARE_LINK}?atlOrigin=abc`)).toBe('123')
  })

  it('accepts a link on the site when the base URL ends in a slash', async () => {
    nock(ATLASSIAN_BASE_URL).get(SHARE_PATH).reply(302, '', { Location: '/wiki/spaces/DOCS/pages/123' })
    const client = createConfluenceClient({ ...TEST_CREDENTIALS, baseUrl: `${ATLASSIAN_BASE_URL}/` })
    expect(await client.pageIdFromShortLink(SHARE_LINK)).toBe('123')
  })

  it.each([
    ['another host', `https://elsewhere.example.com${SHARE_PATH}`],
    ['another scheme', `http://example.atlassian.net${SHARE_PATH}`],
    ['a text that is not an address', 'AQAB']
  ])('rejects a link on %s with USAGE and sends no request', async (_label, link) => {
    const error = await rejectionOf(createConfluenceClient(TEST_CREDENTIALS).pageIdFromShortLink(link))
    expect(error).toMatchObject({
      name: 'HedyError',
      code: 'USAGE',
      message: `page ${link}: Confluence share link is not on the Atlassian site in JIRA_BASE_URL, so hedy will not send the credentials to it. Give a link on that site or the page id, then run the command again.`
    })
  })

  it('rejects a redirect location that holds no page id with USAGE naming the location', async () => {
    nock(ATLASSIAN_BASE_URL).get(SHARE_PATH).reply(302, '', { Location: '/wiki/spaces/DOCS/overview' })
    const error = await rejectionOf(createConfluenceClient(TEST_CREDENTIALS).pageIdFromShortLink(SHARE_LINK))
    expect(error).toMatchObject({
      name: 'HedyError',
      code: 'USAGE',
      message: `page ${SHARE_LINK}: Confluence redirected the link to /wiki/spaces/DOCS/overview, which holds no page id. Open the link in a browser and give the page id from the address, then run the command again.`
    })
  })

  it('rejects a link Confluence does not know with NOT_FOUND, naming the link in the action', async () => {
    nock(ATLASSIAN_BASE_URL).get(SHARE_PATH).reply(404, {})
    const error = await rejectionOf(createConfluenceClient(TEST_CREDENTIALS).pageIdFromShortLink(SHARE_LINK))
    expect(error).toMatchObject({ name: 'HedyError', code: 'NOT_FOUND', message: expect.stringMatching(new RegExp(`^page ${SHARE_LINK}: Confluence found nothing`)) })
  })
})
