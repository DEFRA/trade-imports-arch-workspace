import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { inspect } from 'node:util'
import nock from 'nock'
import { afterEach, beforeEach, expect } from 'vitest'

export const ATLASSIAN_BASE_URL = 'https://example.atlassian.net'

export const TEST_CREDENTIALS = Object.freeze({
  user: 'hedy.tester@example.com',
  token: 'test-token-7d1c',
  baseUrl: ATLASSIAN_BASE_URL
})

export const TEST_AUTHORIZATION = 'Basic aGVkeS50ZXN0ZXJAZXhhbXBsZS5jb206dGVzdC10b2tlbi03ZDFj'

/**
 * A new environment object holding JIRA_USER, JIRA_TOKEN and JIRA_BASE_URL
 * from TEST_CREDENTIALS and nothing else.
 */
export const credentialsEnv = () => ({
  JIRA_USER: TEST_CREDENTIALS.user,
  JIRA_TOKEN: TEST_CREDENTIALS.token,
  JIRA_BASE_URL: TEST_CREDENTIALS.baseUrl
})

/**
 * The Basic Authorization header value for user and token.
 */
export const basicAuthorizationFor = (user, token) => `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`

/**
 * Rows of [label, code, reply, fragments]: reply stages the answer on a nock
 * interceptor, and fragments are texts the error message must carry. Every
 * body that a message must not echo holds the test token and user.
 */
export const FAILURE_REPLIES = [
  ['401', 'AUTH', (interceptor) => interceptor.reply(401, { message: `bad ${TEST_CREDENTIALS.token}` }), ['JIRA_USER and JIRA_TOKEN']],
  ['403', 'AUTH', (interceptor) => interceptor.reply(403, { message: `no access for ${TEST_CREDENTIALS.user}` }), ['JIRA_USER']],
  ['404', 'NOT_FOUND', (interceptor) => interceptor.reply(404, { message: TEST_CREDENTIALS.token }), ['JIRA_BASE_URL']],
  ['429', 'RATE_LIMIT', (interceptor) => interceptor.reply(429, {}), ['Wait a minute']],
  ['400 with reasons', 'USAGE', (interceptor) => interceptor.reply(400, {
    errorMessages: ['The query is not valid.'],
    errors: { summary: 'Summary is required.' }
  }), ['The query is not valid.', 'summary: Summary is required.']],
  ['500', 'NETWORK', (interceptor) => interceptor.reply(500, `<html>${TEST_CREDENTIALS.token}</html>`), ['answered 500']],
  ['a refused connection', 'NETWORK', (interceptor) => interceptor.replyWithError('connect ECONNREFUSED'), ['could not be reached']],
  ['a 200 body that is not JSON', 'PARSE', (interceptor) => interceptor.reply(200, `<html>${TEST_CREDENTIALS.token}</html>`), ['not JSON']]
]

const listenOnLoopback = async (server) => {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      server.closeAllConnections()
      server.close()
      await once(server, 'close')
    }
  }
}

/**
 * Starts a loopback server that accepts every connection and never answers,
 * and lets the calling test connect to it through nock. close() drops every
 * connection and stops the server.
 *
 * @returns {Promise<{ baseUrl: string, close: () => Promise<void> }>}
 */
export const startSilentServer = async () => {
  const loopback = await listenOnLoopback(createServer(() => {}))
  nock.enableNetConnect('127.0.0.1')
  return loopback
}

/**
 * Starts a loopback server for spawned tests. It answers each request with
 * the status and the JSON body replyFor(request) returns, and records the
 * request's url and Authorization header in requests, in arrival order.
 * close() drops every connection and stops the server.
 *
 * @param {(request: import('node:http').IncomingMessage) => { status: number, body: unknown }} replyFor
 * @returns {Promise<{ baseUrl: string, requests: { url: string, authorization: string | undefined }[], close: () => Promise<void> }>}
 */
export const startAnsweringServer = async (replyFor) => {
  const requests = []
  const server = createServer((request, response) => {
    requests.push({ url: request.url, authorization: request.headers.authorization })
    const { status, body } = replyFor(request)
    response.writeHead(status, { 'content-type': 'application/json' })
    response.end(JSON.stringify(body))
  })
  return { requests, ...await listenOnLoopback(server) }
}

/**
 * Registers hooks in the calling test file: real connections are refused in
 * each test, and after each test every interceptor is removed and an
 * interceptor the test left unused fails the test.
 */
export const interceptNetworkPerTest = () => {
  beforeEach(() => {
    nock.disableNetConnect()
  })
  afterEach(() => {
    const unused = nock.pendingMocks()
    nock.cleanAll()
    nock.enableNetConnect()
    expect(unused).toEqual([])
  })
}

/**
 * Resolves to the parsed JSON file at url, such as a captured response
 * under a __fixtures__ folder.
 */
export const readJsonFixture = async (url) => JSON.parse(await readFile(url, 'utf8'))

/**
 * Resolves to the error the promise rejects with; throws when it resolves.
 */
export const rejectionOf = async (promise) => {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected the promise to reject')
}

/**
 * The error as a log would print it, causes and own properties included.
 */
export const printedError = (error) => inspect(error, { depth: Infinity })
