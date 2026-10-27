import nock from 'nock'
import { describe, it, expect } from 'vitest'
import {
  ATLASSIAN_BASE_URL,
  TEST_AUTHORIZATION,
  TEST_CREDENTIALS,
  credentialsEnv,
  interceptNetworkPerTest,
  printedError,
  rejectionOf,
  startSilentServer
} from '../test-support/http.js'
import { createAtlassianHttp, credentialsFromEnv } from './atlassian.js'

interceptNetworkPerTest()

const refusalOf = (env) => {
  try {
    credentialsFromEnv(env)
  } catch (error) {
    return error
  }
  throw new Error('expected credentialsFromEnv to refuse')
}

const MISSING_SETS = [
  [['JIRA_USER'], 'JIRA_USER is not set. Set it in the workspace .env file.'],
  [['JIRA_TOKEN'], 'JIRA_TOKEN is not set. Set it in the workspace .env file.'],
  [['JIRA_BASE_URL'], 'JIRA_BASE_URL is not set. Set it in the workspace .env file.'],
  [['JIRA_USER', 'JIRA_TOKEN'], 'JIRA_USER and JIRA_TOKEN are not set. Set them in the workspace .env file.'],
  [['JIRA_USER', 'JIRA_BASE_URL'], 'JIRA_USER and JIRA_BASE_URL are not set. Set them in the workspace .env file.'],
  [['JIRA_TOKEN', 'JIRA_BASE_URL'], 'JIRA_TOKEN and JIRA_BASE_URL are not set. Set them in the workspace .env file.'],
  [['JIRA_USER', 'JIRA_TOKEN', 'JIRA_BASE_URL'], 'JIRA_USER, JIRA_TOKEN and JIRA_BASE_URL are not set. Set them in the workspace .env file.']
]

const envWithout = (names, form) => {
  const env = credentialsEnv()
  for (const name of names) {
    if (form === 'missing') delete env[name]
    else env[name] = ''
  }
  return env
}

describe('credentialsFromEnv', () => {
  it('returns user, token and baseUrl from JIRA_USER, JIRA_TOKEN and JIRA_BASE_URL, ignoring other variables', () => {
    expect(credentialsFromEnv({ ...credentialsEnv(), HOME: '/home/hedy' })).toEqual({
      user: TEST_CREDENTIALS.user,
      token: TEST_CREDENTIALS.token,
      baseUrl: TEST_CREDENTIALS.baseUrl
    })
  })

  it.each(MISSING_SETS.flatMap(([names, message]) => [
    [names.join(' and '), 'missing', names, message],
    [names.join(' and '), 'empty', names, message]
  ]))('with %s %s throws one AUTH error naming each missing variable and no value', (_label, form, names, message) => {
    const error = refusalOf(envWithout(names, form))
    expect(error).toMatchObject({ name: 'HedyError', code: 'AUTH', message })
    expect(error.message).not.toContain(TEST_CREDENTIALS.user)
    expect(error.message).not.toContain(TEST_CREDENTIALS.token)
  })
})

const PROBE = '/rest/probe'

const probe = (baseUrl = ATLASSIAN_BASE_URL, options = {}) =>
  createAtlassianHttp({ service: 'Jira', user: TEST_CREDENTIALS.user, token: TEST_CREDENTIALS.token, baseUrl, ...options }).get(PROBE, 'probe')

describe('createAtlassianHttp get', () => {
  it('resolves to the parsed body, sending the Basic header for user and token and asking for JSON', async () => {
    nock(ATLASSIAN_BASE_URL)
      .matchHeader('authorization', TEST_AUTHORIZATION)
      .matchHeader('accept', 'application/json')
      .get(PROBE)
      .reply(200, { displayName: 'Ada Lovelace', nested: { kept: true } })
    expect(await probe()).toEqual({ displayName: 'Ada Lovelace', nested: { kept: true } })
  })

  it.each(['/', '///'])('drops the trailing %j from the base URL before adding the path', async (slashes) => {
    nock(ATLASSIAN_BASE_URL).get(PROBE).reply(200, {})
    expect(await probe(`${ATLASSIAN_BASE_URL}${slashes}`)).toEqual({})
  })

  it.each([
    [401, 'AUTH', 'probe: Jira rejected the credentials in JIRA_USER and JIRA_TOKEN. Check both in the workspace .env file.'],
    [403, 'AUTH', 'probe: Jira refused the account in JIRA_USER access to this resource. Check the account\'s Jira permissions, then run the command again.'],
    [404, 'NOT_FOUND', 'probe: Jira found nothing at the requested address. Check the key or id given, and that JIRA_BASE_URL in the workspace .env file is the Atlassian site address.'],
    [429, 'RATE_LIMIT', 'probe: Jira is rate limiting requests. Wait a minute and run the command again.'],
    [500, 'NETWORK', 'probe: Jira answered 500. Run the command again. If the failure repeats, check the Atlassian status page.'],
    [503, 'NETWORK', 'probe: Jira answered 503. Run the command again. If the failure repeats, check the Atlassian status page.']
  ])('maps status %i to %s with a message naming the service, the action and the next step', async (status, code, message) => {
    nock(ATLASSIAN_BASE_URL).get(PROBE).reply(status, { message: `echo ${TEST_CREDENTIALS.token}` })
    const error = await rejectionOf(probe())
    expect(error).toMatchObject({ name: 'HedyError', code, message })
  })

  it.each([
    ['errorMessages and the errors map', { errorMessages: ['The query is not valid.', 'The project is closed.'], errors: { summary: 'Summary is required.' } },
      'probe: Jira refused the request. Jira said "The query is not valid.", "The project is closed." and "summary: Summary is required.". Correct the request, then run the command again.'],
    ['only the errors map', { errorMessages: [], errors: { summary: 'Summary is required.' } },
      'probe: Jira refused the request. Jira said "summary: Summary is required.". Correct the request, then run the command again.'],
    ['only a message', { message: 'Bad cursor.' },
      'probe: Jira refused the request. Jira said "Bad cursor.". Correct the request, then run the command again.'],
    ['no reason at all', {},
      'probe: Jira refused the request without giving a reason. Check the values given, then run the command again.']
  ])('maps a 400 carrying %s to USAGE with those reasons', async (_label, body, message) => {
    nock(ATLASSIAN_BASE_URL).get(PROBE).reply(400, body)
    const error = await rejectionOf(probe())
    expect(error).toMatchObject({ name: 'HedyError', code: 'USAGE', message })
  })

  it.each([405, 409, 422])('maps status %i to USAGE carrying the reasons the service gives', async (status) => {
    nock(ATLASSIAN_BASE_URL).get(PROBE).reply(status, { errorMessages: ['The request conflicts with the issue state.'] })
    const error = await rejectionOf(probe())
    expect(error).toMatchObject({
      name: 'HedyError',
      code: 'USAGE',
      message: 'probe: Jira refused the request. Jira said "The request conflicts with the issue state.". Correct the request, then run the command again.'
    })
  })

  it('maps a service that does not answer within timeoutMs to NETWORK, naming the wait in seconds and holding neither the user nor the token', async () => {
    const server = await startSilentServer()
    const error = await rejectionOf(probe(server.baseUrl, { timeoutMs: 50 })).finally(server.close)
    expect(error).toMatchObject({
      name: 'HedyError',
      code: 'NETWORK',
      message: 'probe: Jira did not answer within 0.05 seconds. Check the network connection and JIRA_BASE_URL in the workspace .env file, then run the command again.'
    })
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.token)
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.user)
  })

  it('maps a refused connection to NETWORK, naming the service and the next step', async () => {
    nock(ATLASSIAN_BASE_URL).get(PROBE).replyWithError('connect ECONNREFUSED')
    const error = await rejectionOf(probe())
    expect(error).toMatchObject({
      name: 'HedyError',
      code: 'NETWORK',
      message: 'probe: Jira could not be reached. Check the network connection and JIRA_BASE_URL in the workspace .env file, then run the command again.'
    })
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.token)
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.user)
  })

  it.each([
    [200, `<html>sign in ${TEST_CREDENTIALS.token}</html>`],
    [200, ''],
    [400, `<html>bad request ${TEST_CREDENTIALS.token}</html>`]
  ])('maps a %i body that is not JSON to PARSE without echoing the body', async (status, body) => {
    nock(ATLASSIAN_BASE_URL).get(PROBE).reply(status, body)
    const error = await rejectionOf(probe())
    expect(error).toMatchObject({
      name: 'HedyError',
      code: 'PARSE',
      message: 'probe: Jira answered with a body that is not JSON. Check that JIRA_BASE_URL in the workspace .env file is the Atlassian site address.'
    })
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.token)
  })
})
