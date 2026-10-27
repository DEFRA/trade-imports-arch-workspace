import nock from 'nock'
import { describe, it, expect } from 'vitest'
import {
  ATLASSIAN_BASE_URL,
  FAILURE_REPLIES,
  TEST_AUTHORIZATION,
  TEST_CREDENTIALS,
  interceptNetworkPerTest,
  printedError,
  rejectionOf
} from '../test-support/http.js'
import { createConfluenceClient } from './confluence.js'

interceptNetworkPerTest()

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

  it.each(FAILURE_REPLIES)('on %s rejects with %s, naming Confluence and whoami and holding neither the user nor the token', async (_label, code, reply, fragments) => {
    reply(nock(ATLASSIAN_BASE_URL).get(CURRENT_USER))
    const error = await rejectionOf(createConfluenceClient(TEST_CREDENTIALS).whoami())
    expect(error).toMatchObject({ name: 'HedyError', code, message: expect.stringMatching(/^whoami: Confluence /) })
    for (const fragment of fragments) expect(error.message).toContain(fragment)
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.token)
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.user)
  })
})
