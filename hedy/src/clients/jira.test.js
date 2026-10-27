import nock from 'nock'
import { describe, it, expect } from 'vitest'
import {
  ATLASSIAN_BASE_URL,
  FAILURE_REPLIES,
  TEST_AUTHORIZATION,
  TEST_CREDENTIALS,
  interceptNetworkPerTest,
  printedError,
  rejectionOf,
  startSilentServer
} from '../test-support/http.js'
import { createJiraClient } from './jira.js'

interceptNetworkPerTest()

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
