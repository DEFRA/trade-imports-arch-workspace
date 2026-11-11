import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Command } from 'commander'
import nock from 'nock'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { isHedyError } from '../../errors.js'
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
import { pageReferenceOf, pageRows, register, runPage } from './page.js'

interceptNetworkPerTest()

const pageResponse = await readJsonFixture(new URL('../../clients/__fixtures__/confluence-page-response.json', import.meta.url))
const pageText = await readFile(new URL('./__fixtures__/page.md', import.meta.url), 'utf8')
const markdownBody = pageText.split('\n').slice(4).join('\n')

const PAGE = '/wiki/rest/api/content/123456'
const SHARE_LINK = `${ATLASSIAN_BASE_URL}/wiki/x/AbCd`

const stagePage = (body) => nock(ATLASSIAN_BASE_URL).get(PAGE).query(true).reply(200, body)

let root

beforeEach(async () => {
  root = await createWorkspace()
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('pageReferenceOf', () => {
  it.each([
    ['a page id', '123456', { id: '123456' }],
    ['a page URL', `${ATLASSIAN_BASE_URL}/wiki/spaces/DOCS/pages/123456/Synthetic+Page`, { id: '123456' }],
    ['a page URL with a query', `${ATLASSIAN_BASE_URL}/wiki/spaces/DOCS/pages/123456?focusedCommentId=7`, { id: '123456' }],
    ['a share link', SHARE_LINK, { shareLink: SHARE_LINK }]
  ])('reads %s', (_label, reference, expected) => {
    expect(pageReferenceOf(reference)).toEqual(expected)
  })

  it.each([
    ['a URL with no page id', 'ftp://x'],
    ['a space URL', `${ATLASSIAN_BASE_URL}/wiki/spaces/DOCS/overview`],
    ['a share path that is not a URL', '/wiki/x/AbCd'],
    ['an id with a letter', '12a'],
    ['an empty reference', '']
  ])('refuses %s with USAGE naming the reference and what a reference can be', (_label, reference) => {
    let thrown
    try {
      pageReferenceOf(reference)
    } catch (error) {
      thrown = error
    }
    expect(isHedyError(thrown)).toBe(true)
    expect(thrown.code).toBe('USAGE')
    expect(thrown.message).toBe(`The reference ${reference} is not a Confluence page. Give a page id, a page URL holding /pages/ and the id, or a share link holding /wiki/x/, then run the command again.`)
  })
})

describe('runPage', () => {
  it('returns the page projection with the body as markdown by default', async () => {
    stagePage(pageResponse)
    const page = await runPage({ reference: '123456', env: credentialsEnv(), workspaceRoot: () => root })
    expect(page).toEqual({
      id: '123456',
      title: 'Synthetic Page for the hedy Fixtures',
      space: 'DOCS',
      version: { number: 4, when: '2026-10-20T10:30:00.000Z', by: 'Ada Lovelace' },
      url: `${ATLASSIAN_BASE_URL}/wiki/spaces/DOCS/pages/123456`,
      labels: pageResponse.metadata.labels.results.map(({ name }) => name),
      body: markdownBody
    })
  })

  it('returns the body as Confluence gave it with format html', async () => {
    stagePage(pageResponse)
    const page = await runPage({ reference: '123456', format: 'html', env: credentialsEnv(), workspaceRoot: () => root })
    expect(page.body).toBe(pageResponse.body.view.value)
  })

  it.each(['markdown', 'html'])('returns an empty body in %s format when the answer holds no body', async (format) => {
    const { body: _body, ...pageWithoutBody } = pageResponse
    stagePage(pageWithoutBody)
    const page = await runPage({ reference: '123456', format, env: credentialsEnv(), workspaceRoot: () => root })
    expect(page.body).toBe('')
  })

  it('follows a share link on the site to the page it redirects to', async () => {
    nock(ATLASSIAN_BASE_URL).get('/wiki/x/AbCd').reply(302, '', { Location: '/wiki/spaces/DOCS/pages/123456/Synthetic+Page' })
    stagePage(pageResponse)
    const page = await runPage({ reference: SHARE_LINK, env: credentialsEnv(), workspaceRoot: () => root })
    expect(page.id).toBe('123456')
  })

  it('refuses a share link off the site with USAGE and sends no request', async () => {
    const error = await rejectionOf(runPage({ reference: 'https://elsewhere.example.com/wiki/x/AbCd', env: credentialsEnv(), workspaceRoot: () => root }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toContain('not on the Atlassian site in JIRA_BASE_URL')
  })

  it('throws AUTH naming the missing variables and sends no request when the credentials are incomplete', async () => {
    const error = await rejectionOf(runPage({ reference: '123456', env: { JIRA_USER: TEST_CREDENTIALS.user }, workspaceRoot: () => root }))
    expect(error.code).toBe('AUTH')
    expect(error.message).toContain('JIRA_TOKEN and JIRA_BASE_URL are not set')
  })

  it('refuses a reference that is not a page with USAGE before reading the credentials', async () => {
    const error = await rejectionOf(runPage({ reference: 'ftp://x', env: {}, workspaceRoot: () => root }))
    expect(error.code).toBe('USAGE')
  })
})

describe('pageRows', () => {
  const page = {
    title: 'Synthetic Page for the hedy Fixtures',
    space: 'DOCS',
    version: { number: 4, when: '2026-10-20T10:30:00.000Z', by: 'Ada Lovelace' },
    url: `${ATLASSIAN_BASE_URL}/wiki/spaces/DOCS/pages/123456`
  }

  it('gives the space, version with its time, author and source rows', () => {
    expect(pageRows(page)).toEqual([
      ['Space', 'DOCS'],
      ['Version', '4 (2026-10-20T10:30:00.000Z)'],
      ['By', 'Ada Lovelace'],
      ['Source', `${ATLASSIAN_BASE_URL}/wiki/spaces/DOCS/pages/123456`]
    ])
  })

  it('gives unknown in the By row for a version with no author', () => {
    expect(pageRows({ ...page, version: { number: 4, when: '2026-10-20T10:30:00.000Z' } })[2]).toEqual(['By', 'unknown'])
  })
})

const harness = () => {
  const io = captureIo()
  const program = new Command().option('--json').exitOverride()
  register(program, { ...io, env: credentialsEnv(), workspaceRoot: () => root })
  return { program, ...io }
}

describe('the confluence page command', () => {
  it('in text mode prints the title, the version line, the source and the markdown body byte for byte', async () => {
    stagePage(pageResponse)
    const h = harness()
    await h.program.parseAsync(['page', '123456'], { from: 'user' })
    expect(h.out.join('')).toBe(pageText)
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([0])
  })

  it('in text mode writes unknown for a version with no author', async () => {
    stagePage({ ...pageResponse, version: { ...pageResponse.version, by: undefined } })
    const h = harness()
    await h.program.parseAsync(['page', '123456'], { from: 'user' })
    expect(h.out.join('').split('\n')[1]).toBe('Space: DOCS | Version: 4 (2026-10-20T10:30:00.000Z) | By: unknown')
  })

  it.each([[[]], [['--format', 'html']]])('with %j prints only the three header lines and a blank line when the answer holds no body', async (formatArgs) => {
    const { body: _body, ...pageWithoutBody } = pageResponse
    stagePage(pageWithoutBody)
    const h = harness()
    await h.program.parseAsync(['page', '123456', ...formatArgs], { from: 'user' })
    expect(h.out.join('')).toBe(`${pageText.split('\n').slice(0, 3).join('\n')}\n\n`)
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([0])
  })

  it('with --format html prints the HTML body under the same header', async () => {
    stagePage(pageResponse)
    const h = harness()
    await h.program.parseAsync(['page', '123456', '--format', 'html'], { from: 'user' })
    expect(h.out.join('')).toBe(`${pageText.split('\n').slice(0, 4).join('\n')}\n${pageResponse.body.view.value.replace(/\n$/, '')}\n`)
  })

  it('refuses a --format other than markdown or html with one USAGE line naming --format, exit 2 and no request', async () => {
    const h = harness()
    await h.program.parseAsync(['page', '123456', '--format', 'pdf'], { from: 'user' })
    expect(h.out).toEqual([])
    expect(h.err).toEqual(['--format must be markdown or html. Run the command again with one of them.\n'])
    expect(h.codes).toEqual([2])
  })
})

describe('hedy confluence page, spawned', () => {
  const childEnv = () => ({ HEDY_WORKSPACE: root, JIRA_USER: undefined, JIRA_TOKEN: undefined, JIRA_BASE_URL: undefined })

  it.each([
    ['a reference that is not a page', ['confluence', 'page', 'ftp://x', '--json'], 'The reference ftp://x is not a Confluence page.'],
    ['an unknown --format', ['confluence', 'page', '12', '--format', 'pdf', '--json'], '--format']
  ])('with %s gives one USAGE entry and no AUTH entry, so no .env was read, and exits 2', async (_label, args, message) => {
    const result = await runCli(args, { env: childEnv() })
    expect(result.exitCode).toBe(2)
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.errors.map(({ code }) => code)).toEqual(['USAGE'])
    expect(result.envelope.errors[0].message).toContain(message)
  })

  it('123456 prints the page text byte for byte, with the server address in place of the site, and exits 0', async () => {
    const server = await startAnsweringServer(() => ({ status: 200, body: pageResponse }))
    try {
      await writeFile(join(root, '.env'), `JIRA_USER=file-user\nJIRA_TOKEN=file-token\nJIRA_BASE_URL=${server.baseUrl}\n`)
      const result = await runCli(['confluence', 'page', '123456'], { env: childEnv() })
      expect(result.exitCode).toBe(0)
      expect(result.stdout.replaceAll(server.baseUrl, ATLASSIAN_BASE_URL)).toBe(pageText.replace(/\n$/, ''))
      expect(server.requests.map(({ authorization }) => authorization)).toEqual([basicAuthorizationFor('file-user', 'file-token')])
    } finally {
      await server.close()
    }
  })
})
