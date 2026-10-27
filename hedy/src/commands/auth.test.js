import { once } from 'node:events'
import { rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { Command } from 'commander'
import nock from 'nock'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { isHedyError } from '../errors.js'
import { createWorkspace, runCli } from '../test-support/cli.js'
import {
  ATLASSIAN_BASE_URL,
  TEST_CREDENTIALS,
  basicAuthorizationFor,
  credentialsEnv,
  interceptNetworkPerTest,
  rejectionOf
} from '../test-support/http.js'
import { captureIo } from '../test-support/io.js'
import { register, runAuth } from './auth.js'

interceptNetworkPerTest()

const MYSELF = '/rest/api/2/myself'
const CURRENT_USER = '/wiki/rest/api/user/current'

const stageJira = (status, body) => nock(ATLASSIAN_BASE_URL).get(MYSELF).reply(status, body)
const stageConfluence = (status, body) => nock(ATLASSIAN_BASE_URL).get(CURRENT_USER).reply(status, body)

let root

beforeEach(async () => {
  root = await createWorkspace()
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('runAuth', () => {
  it('returns each service display name when both services accept the credentials', async () => {
    stageJira(200, { displayName: 'Ada Lovelace', emailAddress: 'ada@example.com' })
    stageConfluence(200, { displayName: 'Ada L.', accountId: '557058:0a1b' })
    expect(await runAuth({ env: credentialsEnv(), workspaceRoot: () => root })).toEqual({
      jira: { displayName: 'Ada Lovelace' },
      confluence: { displayName: 'Ada L.' }
    })
  })

  it('throws an AggregateError holding only the Jira AUTH error when Jira answers 401 and Confluence 200', async () => {
    stageJira(401, {})
    stageConfluence(200, { displayName: 'Ada L.' })
    const error = await rejectionOf(runAuth({ env: credentialsEnv(), workspaceRoot: () => root }))
    expect(error).toBeInstanceOf(AggregateError)
    expect(error.errors).toHaveLength(1)
    expect(error.errors[0].code).toBe('AUTH')
    expect(error.errors[0].message).toMatch(/^whoami: Jira /)
  })

  it('throws an AggregateError holding both AUTH errors, Jira first, when both services answer 401', async () => {
    stageJira(401, {})
    stageConfluence(401, {})
    const error = await rejectionOf(runAuth({ env: credentialsEnv(), workspaceRoot: () => root }))
    expect(error).toBeInstanceOf(AggregateError)
    expect(error.errors.map(({ code }) => code)).toEqual(['AUTH', 'AUTH'])
    expect(error.errors[0].message).toMatch(/^whoami: Jira /)
    expect(error.errors[1].message).toMatch(/^whoami: Confluence /)
  })

  it('throws one AUTH error naming each missing variable and sends no request when env lacks them', async () => {
    const error = await rejectionOf(runAuth({ env: { JIRA_USER: TEST_CREDENTIALS.user }, workspaceRoot: () => root }))
    expect(isHedyError(error)).toBe(true)
    expect(error.code).toBe('AUTH')
    expect(error.message).toContain('JIRA_TOKEN and JIRA_BASE_URL are not set')
  })
})

const harness = (env) => {
  const io = captureIo()
  const program = new Command().option('--json').exitOverride()
  register(program, { ...io, env, workspaceRoot: () => root })
  return { program, ...io }
}

describe('the auth command', () => {
  it('in text mode prints one ok line per service with the display name and sets exit 0', async () => {
    stageJira(200, { displayName: 'Ada Lovelace' })
    stageConfluence(200, { displayName: 'Ada L.' })
    const h = harness(credentialsEnv())
    await h.program.parseAsync(['auth'], { from: 'user' })
    expect(h.out.join('')).toBe('jira: ok as Ada Lovelace\nconfluence: ok as Ada L.\n')
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([0])
  })

  it('in text mode says in words that a service gave no display name', async () => {
    stageJira(200, {})
    stageConfluence(200, { displayName: 'Ada L.' })
    const h = harness(credentialsEnv())
    await h.program.parseAsync(['auth'], { from: 'user' })
    expect(h.out.join('')).toBe('jira: ok as an account with no display name\nconfluence: ok as Ada L.\n')
  })

  it('with --json on a double failure prints one envelope with two AUTH entries and sets exit 1', async () => {
    stageJira(401, {})
    stageConfluence(401, {})
    const h = harness(credentialsEnv())
    await h.program.parseAsync(['auth', '--json'], { from: 'user' })
    expect(h.out).toHaveLength(1)
    const envelope = JSON.parse(h.out[0])
    expect(envelope.ok).toBe(false)
    expect(envelope.errors.map(({ code }) => code)).toEqual(['AUTH', 'AUTH'])
    expect(envelope.errors[0].message).toContain('Jira')
    expect(envelope.errors[1].message).toContain('Confluence')
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([1])
  })
})

const startRefusingServer = async () => {
  const requests = []
  const server = createServer((request, response) => {
    requests.push({ url: request.url, authorization: request.headers.authorization })
    response.writeHead(401, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ message: 'Unauthorized' }))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return {
    requests,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      server.closeAllConnections()
      server.close()
      await once(server, 'close')
    }
  }
}

describe('hedy auth, spawned', () => {
  let server

  beforeEach(async () => {
    server = await startRefusingServer()
  })

  afterEach(async () => {
    await server.close()
  })

  const childEnv = (overrides = {}) => ({
    HEDY_WORKSPACE: root,
    JIRA_USER: undefined,
    JIRA_TOKEN: undefined,
    JIRA_BASE_URL: undefined,
    ...overrides
  })

  const writeEnvFile = (lines) => writeFile(join(root, '.env'), `${lines.join('\n')}\n`)

  it('with no .env and no credentials gives one AUTH entry naming all three variables, exit 1, and sends no request', async () => {
    const result = await runCli(['auth', '--json'], { env: childEnv() })
    expect(result.exitCode).toBe(1)
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.errors).toHaveLength(1)
    expect(result.envelope.errors[0].code).toBe('AUTH')
    expect(result.envelope.errors[0].message).toContain('JIRA_USER, JIRA_TOKEN and JIRA_BASE_URL are not set')
    expect(server.requests).toEqual([])
  })

  it('reads the credentials from the workspace .env and probes both services with them', async () => {
    await writeEnvFile(['JIRA_USER=file-user', 'JIRA_TOKEN=file-token', `JIRA_BASE_URL=${server.baseUrl}`])
    const result = await runCli(['auth', '--json'], { env: childEnv() })
    expect(result.exitCode).toBe(1)
    expect(result.envelope.errors.map(({ code }) => code)).toEqual(['AUTH', 'AUTH'])
    expect([...server.requests].sort((a, b) => a.url.localeCompare(b.url))).toEqual([
      { url: MYSELF, authorization: basicAuthorizationFor('file-user', 'file-token') },
      { url: CURRENT_USER, authorization: basicAuthorizationFor('file-user', 'file-token') }
    ])
  })

  it('takes a variable from the environment over the same variable in the workspace .env', async () => {
    await writeEnvFile(['JIRA_USER=file-user', 'JIRA_TOKEN=file-token', `JIRA_BASE_URL=${server.baseUrl}`])
    const result = await runCli(['auth', '--json'], { env: childEnv({ JIRA_TOKEN: 'env-token' }) })
    expect(result.exitCode).toBe(1)
    expect(server.requests.map(({ authorization }) => authorization)).toEqual([
      basicAuthorizationFor('file-user', 'env-token'),
      basicAuthorizationFor('file-user', 'env-token')
    ])
  })
})
