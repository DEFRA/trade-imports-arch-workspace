import { readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Command } from 'commander'
import nock from 'nock'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createWorkspace, runCli } from '../../test-support/cli.js'
import { copyFixtureDocsRepo, installFakePublisher } from '../../test-support/docs-repo.js'
import {
  ATLASSIAN_BASE_URL,
  TEST_AUTHORIZATION,
  TEST_CREDENTIALS,
  credentialsEnv,
  interceptNetworkPerTest,
  printedError,
  readJsonFixture,
  rejectionOf,
  startAnsweringServer
} from '../../test-support/http.js'
import { captureIo } from '../../test-support/io.js'
import { register, renderPublish, runPublish } from './publish.js'

interceptNetworkPerTest()

const fixturesUrl = new URL('./__fixtures__/', import.meta.url)
const clientFixturesUrl = new URL('../../clients/__fixtures__/', import.meta.url)
const publisherLog = (name) => readJsonFixture(new URL(`publisher-${name}.json`, fixturesUrl))
const byTitleAnswer = await readJsonFixture(new URL('confluence-content-by-title-response.json', clientFixturesUrl))
const byTitleEmptyAnswer = await readJsonFixture(new URL('confluence-content-by-title-empty.json', clientFixturesUrl))
const pageResponse = await readJsonFixture(new URL('confluence-page-response.json', clientFixturesUrl))

const PAGE = 'docs/systems/HEDY/Guide/publishing.md'
const READ_BACK_VERSION = { number: 4, when: '2026-10-20T10:30:00.000Z', by: 'Ada Lovelace' }
const pageUrlFor = (id) => `${ATLASSIAN_BASE_URL}/wiki/spaces/HEDYDOCS/pages/${id}`
const readBackAnswer = (id) => ({ ...pageResponse, id, title: 'Publishing guide', space: { key: 'HEDYDOCS' } })

const byTitleAnswerWithLabels = (names) => ({
  ...byTitleAnswer,
  results: [{
    ...byTitleAnswer.results[0],
    metadata: { ...byTitleAnswer.results[0].metadata, labels: { results: names.map((name) => ({ prefix: 'global', name, label: name })) } }
  }]
})

const stageProbe = () => nock(ATLASSIAN_BASE_URL)
  .get('/wiki/rest/api/user/current')
  .reply(200, { type: 'known', displayName: 'Hedy Tester' })
const stageLookup = (answer = byTitleAnswer) => nock(ATLASSIAN_BASE_URL).get('/wiki/rest/api/content').query(true).reply(200, answer)
const stageReadBack = (id) => nock(ATLASSIAN_BASE_URL).get(`/wiki/rest/api/content/${id}`).query(true).reply(200, readBackAnswer(id))
const stagePreChecks = (answer) => {
  stageProbe()
  stageLookup(answer)
}

const testEnv = () => ({ ...credentialsEnv(), PATH: process.env.PATH, HOME: process.env.HOME })

let root
let docsRepo
let io

beforeEach(async () => {
  root = await createWorkspace()
  docsRepo = await copyFixtureDocsRepo(root)
  io = captureIo()
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const publish = ({ page = PAGE, env = testEnv(), cwd = root, timeoutMs, confirm = async () => true } = {}) =>
  runPublish({ page, env, workspaceRoot: () => root, cwd, timeoutMs, stderr: io.stderr, confirm })

const recordingConfirm = (calls, { answer = true } = {}) => async (facts) => {
  calls.push(facts)
  return answer
}

const installScenario = async (scenario) => installFakePublisher(docsRepo, typeof scenario === 'string' ? await publisherLog(scenario) : scenario)

const readCall = async (callPath) => JSON.parse(await readFile(callPath, 'utf8'))

const publisherRan = async () => (await readdir(join(docsRepo, 'scripts', 'confluence'))).includes('publisher-call.json')

const relayedText = () => io.err.join('')

describe('runPublish with a publisher that succeeds', () => {
  it('resolves to the outcome and the read back, runs npm in the docs repo with the page and only the three publisher variables added, and relays both streams', async () => {
    const scenario = await publisherLog('updated')
    const callPath = await installFakePublisher(docsRepo, scenario)
    stagePreChecks()
    stageReadBack('201')
    const result = await publish()
    expect(result).toEqual({
      mode: 'updated',
      page: PAGE,
      id: '201',
      title: 'Publishing guide',
      space: 'HEDYDOCS',
      url: pageUrlFor('201'),
      version: READ_BACK_VERSION,
      warnings: ['⚠️  No GitHub URL for folder path: docs/systems/HEDY/Guide'],
      links: { checked: 1, pages: 1, broken: 0, unreachable: 0 }
    })
    expect(await readCall(callPath)).toEqual({
      cwd: await realpath(docsRepo),
      args: ['--config', 'scripts/confluence/confluence-config.json', '--file', PAGE],
      env: { CONFLUENCE_USERNAME: TEST_CREDENTIALS.user, CONFLUENCE_API_TOKEN: TEST_CREDENTIALS.token, CONFLUENCE_URL: ATLASSIAN_BASE_URL }
    })
    expect(relayedText()).toContain(scenario.stderr)
    expect(relayedText()).toContain(scenario.stdout)
  })

  it.each([
    ['an absolute path', async () => join(docsRepo, PAGE)],
    ['a path under the docs folder', async () => 'systems/HEDY/Guide/publishing.md']
  ])('given the page as %s passes the publisher the same docs path', async (_label, givenPage) => {
    const callPath = await installScenario('updated')
    stagePreChecks()
    stageReadBack('201')
    await publish({ page: await givenPage() })
    expect((await readCall(callPath)).args).toEqual(['--config', 'scripts/confluence/confluence-config.json', '--file', PAGE])
  })

  it('reports created with the new id when Confluence holds no page with the title', async () => {
    await installScenario('created')
    stagePreChecks(byTitleEmptyAnswer)
    stageReadBack('301')
    const result = await publish()
    expect(result.mode).toBe('created')
    expect(result.id).toBe('301')
    expect(result.url).toBe(pageUrlFor('301'))
  })

  it('resolves with the publisher\'s image warning among the warnings when the publisher could not find an image', async () => {
    await installScenario('image-missing')
    stagePreChecks()
    stageReadBack('203')
    const result = await publish()
    expect(result.mode).toBe('updated')
    expect(result.warnings).toContain('⚠️  Image not found: diagrams/nothing.svg (resolved to: /home/hedy/trade-imports-arch-workspace/trade-imports-documentation/docs/systems/HEDY/Guide/diagrams/nothing.svg)')
  })

  it('rethrows a failed read back with its code, naming the id, the page address and the inner message, with the inner error as the cause', async () => {
    await installScenario('updated')
    stagePreChecks()
    nock(ATLASSIAN_BASE_URL).get('/wiki/rest/api/content/201').query(true).reply(500, {})
    const error = await rejectionOf(publish())
    expect(error.code).toBe('NETWORK')
    expect(error.cause.code).toBe('NETWORK')
    expect(error.message).toBe(`The publisher reported the page Publishing guide updated as 201 at ${pageUrlFor('201')}, but reading the page back failed: ${error.cause.message} Open the page in Confluence to check it, then run the command again if needed.`)
    expect(error.cause.message).toContain('answered 500')
  })
})

describe('runPublish pre-flight refusals', () => {
  it.each([
    ['a page no publishPaths entry lists', 'docs/notes/unlisted.md', 'notes/unlisted.md'],
    ['a page a glob entry excludes', 'docs/systems/HEDY/Guide/editorial-profile.md', 'systems/HEDY/Guide/editorial-profile.md']
  ])('refuses %s with USAGE naming the page and the config, before reading credentials, sending a request or asking confirm', async (_label, page, relativeToDocs) => {
    await installScenario('updated')
    const configPath = join(await realpath(docsRepo), 'scripts', 'confluence', 'confluence-config.json')
    const confirmCalls = []
    const error = await rejectionOf(publish({ page, env: {}, confirm: recordingConfirm(confirmCalls) }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The page ${relativeToDocs} is not listed in publishPaths in ${configPath}, or its entry excludes the page, so the publisher would publish nothing. Add an entry with path ${relativeToDocs}, then run the command again.`)
    expect(await publisherRan()).toBe(false)
    expect(confirmCalls).toEqual([])
  })

  it('refuses a page whose Mermaid export is missing with USAGE naming the diagram, the build and the fenced block, before reading credentials or asking confirm', async () => {
    await installScenario('updated')
    const confirmCalls = []
    const error = await rejectionOf(publish({ page: 'docs/systems/HEDY/components.md', env: {}, confirm: recordingConfirm(confirmCalls) }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe('The page docs/systems/HEDY/components.md embeds diagrams whose exports are missing or stale: mermaid "hedy-flow" (missing). Run npm --prefix ~/trade-imports-arch-workspace/trade-imports-documentation run build:mmd, then run the command again. The page also holds 1 fenced Mermaid block(s). Check each block renders before the build.')
    expect(await publisherRan()).toBe(false)
    expect(confirmCalls).toEqual([])
  })

  it('refuses a page embedding an image that is not a file with USAGE naming the image path, before reading credentials or asking confirm', async () => {
    await installScenario('updated')
    const confirmCalls = []
    const error = await rejectionOf(publish({ page: 'docs/systems/HEDY/Guide/figures.md', env: {}, confirm: recordingConfirm(confirmCalls) }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe('The page docs/systems/HEDY/Guide/figures.md embeds images that are not files: diagrams/nothing.svg. Add each file or correct the path in the page, then run the command again.')
    expect(await publisherRan()).toBe(false)
    expect(confirmCalls).toEqual([])
  })

  it('refuses with USAGE naming the title, the space, the address and the generated label when Confluence holds the page without that label, and never asks confirm or runs the publisher', async () => {
    await installScenario('updated')
    stagePreChecks(byTitleAnswerWithLabels(['hedy']))
    const confirmCalls = []
    const error = await rejectionOf(publish({ confirm: recordingConfirm(confirmCalls) }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`Confluence holds a page titled "Publishing guide" in space HEDYDOCS at ${pageUrlFor('201')} without the label generated, so the publisher would leave the page alone. Add the label generated to the page in Confluence, then run the command again.`)
    expect(await publisherRan()).toBe(false)
    expect(confirmCalls).toEqual([])
  })

  it('refuses incomplete credentials with AUTH before asking confirm', async () => {
    await installScenario('updated')
    const confirmCalls = []
    const error = await rejectionOf(publish({ env: { JIRA_USER: TEST_CREDENTIALS.user }, confirm: recordingConfirm(confirmCalls) }))
    expect(error.code).toBe('AUTH')
    expect(await publisherRan()).toBe(false)
    expect(confirmCalls).toEqual([])
  })
})

describe('runPublish asking confirm', () => {
  it('asks confirm once with the real path, the docs page, the title, the space and the id and address of the labelled page Confluence holds', async () => {
    await installScenario('updated')
    stagePreChecks()
    stageReadBack('201')
    const confirmCalls = []
    const result = await publish({ confirm: recordingConfirm(confirmCalls) })
    expect(confirmCalls).toEqual([{
      absolutePath: join(await realpath(docsRepo), PAGE),
      page: PAGE,
      title: 'Publishing guide',
      space: 'HEDYDOCS',
      existing: { id: '201', url: pageUrlFor('201') }
    }])
    expect(result.mode).toBe('updated')
  })

  it('asks confirm with existing undefined when Confluence holds no page with the title', async () => {
    await installScenario('created')
    stagePreChecks(byTitleEmptyAnswer)
    stageReadBack('301')
    const confirmCalls = []
    await publish({ confirm: recordingConfirm(confirmCalls) })
    expect(confirmCalls.map(({ existing }) => existing)).toEqual([undefined])
  })

  it('resolves to cancelled with the page, the title and the space, with no read back staged, and runs no publisher when confirm resolves false', async () => {
    await installScenario('updated')
    stagePreChecks()
    const result = await publish({ confirm: recordingConfirm([], { answer: false }) })
    expect(result).toEqual({ mode: 'cancelled', page: PAGE, title: 'Publishing guide', space: 'HEDYDOCS' })
    expect(await publisherRan()).toBe(false)
  })

  it.each([
    ['missing', undefined],
    ['not a function', true]
  ])('refuses a confirm that is %s with USAGE naming the confirm option before the page check', async (_label, confirm) => {
    await installScenario('updated')
    const error = await rejectionOf(runPublish({ page: 'docs/notes/unlisted.md', env: {}, workspaceRoot: () => root, cwd: root, stderr: io.stderr, confirm }))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe('runPublish needs the confirm option, an async function that resolves true to publish or false to cancel. Pass confirm, then call runPublish again.')
    expect(await publisherRan()).toBe(false)
  })
})

describe('renderPublish', () => {
  it('prints Nothing was sent. for a cancelled result', () => {
    expect(renderPublish({ mode: 'cancelled', page: PAGE, title: 'Publishing guide', space: 'HEDYDOCS' })).toBe('Nothing was sent.')
  })
})

describe('runPublish reading the publisher\'s log', () => {
  it('refuses with USAGE and sends no read back when the publisher skipped the page for the generated label, and no output holds the token', async () => {
    await installScenario('skipped-no-label')
    stagePreChecks()
    const error = await rejectionOf(publish())
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe('Confluence holds a page titled "Publishing guide" in space HEDYDOCS without the label generated, so the publisher left the page alone. Add the label generated to the page in Confluence, then run the command again.')
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.token)
    expect(relayedText()).not.toContain(TEST_CREDENTIALS.token)
  })

  it('rejects NETWORK naming the page address and the failed image when an upload failed, and no output holds the token', async () => {
    await installScenario('upload-failed')
    stagePreChecks()
    const error = await rejectionOf(publish())
    expect(error.code).toBe('NETWORK')
    expect(error.message).toBe(`The publisher wrote the page Publishing guide at ${pageUrlFor('201')}, but 1 image upload(s) failed: flow.svg. Run the command again to upload the images.`)
    expect(printedError(error)).not.toContain(TEST_CREDENTIALS.token)
    expect(relayedText()).not.toContain(TEST_CREDENTIALS.token)
  })

  it('rejects USAGE naming the page address and the broken link line when the link check failed', async () => {
    const scenario = await publisherLog('broken-link')
    await installFakePublisher(docsRepo, scenario)
    stagePreChecks()
    const error = await rejectionOf(publish())
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The publisher wrote the page Publishing guide at ${pageUrlFor('204')}, but the link check found broken links: ❌ Broken link on 'Links': https://example.atlassian.net/wiki/spaces/HEDYDOCS/pages/999 (no Confluence page has ID 999). Fix the links in ${PAGE}, then run the command again.`)
  })

  it('rejects UNKNOWN with the first error line when the publisher wrote the page and then failed for another reason', async () => {
    await installScenario({ exitCode: 1, stdout: '', stderr: '  ✅ Updated successfully (ID: 201)\n  ❌ Fatal error: late\n' })
    stagePreChecks()
    const error = await rejectionOf(publish())
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toBe(`The publisher wrote the page Publishing guide at ${pageUrlFor('201')} and then failed: ❌ Fatal error: late. Read the publisher's log above, then run the command again.`)
  })

  it('rejects UNKNOWN saying no reason was given when the publisher wrote the page and then exited non-zero with no error line', async () => {
    await installScenario({ exitCode: 1, stdout: '', stderr: '  ✅ Updated successfully (ID: 201)\n' })
    stagePreChecks()
    const error = await rejectionOf(publish())
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toContain('and then failed: no reason given.')
  })

  it('rejects UNKNOWN naming the config path when the publisher published nothing and gave no reason', async () => {
    await installScenario('nothing-matched')
    stagePreChecks()
    const configPath = join(await realpath(docsRepo), 'scripts', 'confluence', 'confluence-config.json')
    const error = await rejectionOf(publish())
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toBe(`The publisher published nothing for ${PAGE} and gave no reason. Check that ${configPath} lists the page and that the docs repo is installed, then run the command again.`)
  })

  it('rejects UNKNOWN carrying the publisher\'s first error line when the publisher failed before publishing, and relays its stderr in order', async () => {
    const scenario = { exitCode: 1, stdout: '', stderr: '  ❌ Fatal error: boom\n  ❌ Second line\n' }
    await installScenario(scenario)
    stagePreChecks()
    const error = await rejectionOf(publish())
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toBe(`The publisher failed before publishing ${PAGE}: ❌ Fatal error: boom. Read the publisher's log above, then run the command again.`)
    expect(relayedText()).toContain(scenario.stderr)
  })

  it('rejects UNKNOWN saying no reason was given when the publisher failed with no error line', async () => {
    await installScenario({ exitCode: 2, stdout: '', stderr: '' })
    stagePreChecks()
    const error = await rejectionOf(publish())
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toBe(`The publisher failed before publishing ${PAGE}: no reason given. Read the publisher's log above, then run the command again.`)
  })

  it('stops a publisher that runs past the timeout and rejects NETWORK naming the minutes', async () => {
    await installScenario({ hang: true })
    stagePreChecks()
    const error = await rejectionOf(publish({ timeoutMs: 300 }))
    expect(error.code).toBe('NETWORK')
    expect(error.message).toBe('The publisher did not finish within 0.005 minutes and was stopped. Check the page in Confluence, then run the command again.')
  })
})

const harness = () => {
  const commandIo = captureIo()
  const program = new Command().option('--json').exitOverride()
  register(program, { ...commandIo, env: testEnv(), workspaceRoot: () => root })
  return { program, ...commandIo }
}

describe('the confluence publish command', () => {
  it('in text mode prints the title, the updated address, each warning and the link counts, and exits 0', async () => {
    await installScenario('updated')
    stagePreChecks()
    stageReadBack('201')
    const h = harness()
    await h.program.parseAsync(['publish', PAGE], { from: 'user' })
    expect(h.out.join('')).toBe([
      'Publishing guide',
      `Updated: ${pageUrlFor('201')}`,
      '⚠️  No GitHub URL for folder path: docs/systems/HEDY/Guide',
      'Links checked: 1 on 1 page(s); broken 0, external unreachable 0',
      ''
    ].join('\n'))
    expect(h.codes).toEqual([0])
  })

  it('in text mode prints the created address and no link line when the log holds no link check', async () => {
    await installScenario({ exitCode: 0, stdout: '', stderr: '  ✅ Created successfully (ID: 301)\n' })
    stagePreChecks(byTitleEmptyAnswer)
    stageReadBack('301')
    const h = harness()
    await h.program.parseAsync(['publish', PAGE], { from: 'user' })
    expect(h.out.join('')).toBe(`Publishing guide\nCreated: ${pageUrlFor('301')}\n`)
  })

  it('refuses an empty page path with one USAGE line, exit 2 and no publisher run', async () => {
    await installScenario('updated')
    const h = harness()
    await h.program.parseAsync(['publish', ''], { from: 'user' })
    expect(h.out).toEqual([])
    expect(h.err).toEqual(['The page path is empty. Give the path of a docs page, then run the command again.\n'])
    expect(h.codes).toEqual([2])
    expect(await publisherRan()).toBe(false)
  })
})

describe('hedy confluence publish, spawned', () => {
  const childEnv = { HEDY_WORKSPACE: undefined, JIRA_USER: undefined, JIRA_TOKEN: undefined, JIRA_BASE_URL: undefined }

  it('with no page gives one USAGE entry naming the page argument and exits 2', async () => {
    const result = await runCli(['--workspace', root, 'confluence', 'publish', '--json'], { env: childEnv })
    expect(result.exitCode).toBe(2)
    expect(result.envelope.errors.map(({ code }) => code)).toEqual(['USAGE'])
    expect(result.envelope.errors[0].message).toContain("'page'")
  })

  it('in a workspace without the docs repo gives one USAGE entry naming the clone command and exits 2', async () => {
    const bare = await createWorkspace()
    try {
      const result = await runCli(['--workspace', bare, 'confluence', 'publish', 'x.md', '--json'], { env: childEnv })
      expect(result.exitCode).toBe(2)
      expect(result.envelope.errors.map(({ code }) => code)).toEqual(['USAGE'])
      expect(result.envelope.errors[0].message).toContain('make -C ~/trade-imports-arch-workspace clone')
    } finally {
      await rm(bare, { recursive: true, force: true })
    }
  })

  it('publishes through the fake publisher against a loopback Confluence, reports updated with the id, exits 0 and sends the credentials from .env on every request', async () => {
    await installScenario('updated')
    const server = await startAnsweringServer((request) => {
      if (request.url === '/wiki/rest/api/user/current') return { status: 200, body: { type: 'known', displayName: 'Hedy Tester' } }
      if (request.url.startsWith('/wiki/rest/api/content?')) return { status: 200, body: byTitleAnswer }
      if (request.url.startsWith('/wiki/rest/api/content/201')) return { status: 200, body: readBackAnswer('201') }
      return { status: 404, body: {} }
    })
    try {
      await writeFile(join(root, '.env'), `JIRA_USER=${TEST_CREDENTIALS.user}\nJIRA_TOKEN=${TEST_CREDENTIALS.token}\nJIRA_BASE_URL=${server.baseUrl}\n`)
      const result = await runCli(['--workspace', root, 'confluence', 'publish', PAGE, '--json'], { env: childEnv })
      expect(result.exitCode).toBe(0)
      expect(result.envelope.ok).toBe(true)
      expect(result.envelope.result.mode).toBe('updated')
      expect(result.envelope.result.id).toBe('201')
      expect(server.requests.length).toBe(3)
      expect(server.requests.map(({ authorization }) => authorization)).toEqual([TEST_AUTHORIZATION, TEST_AUTHORIZATION, TEST_AUTHORIZATION])
    } finally {
      await server.close()
    }
  })
})
