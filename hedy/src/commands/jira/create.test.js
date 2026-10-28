import { chmod, copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { Command } from 'commander'
import nock from 'nock'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createWorkspace, runCli } from '../../test-support/cli.js'
import {
  ATLASSIAN_BASE_URL,
  credentialsEnv,
  interceptNetworkPerTest,
  readJsonFixture,
  rejectionOf
} from '../../test-support/http.js'
import { captureIo } from '../../test-support/io.js'
import { RECEIPT_FILENAME, createPlanRows, register, runCreate } from './create.js'

interceptNetworkPerTest()

const fixturesUrl = new URL('./__fixtures__/', import.meta.url)
const createRequest = await readJsonFixture(new URL('create-request.json', fixturesUrl))
const createResponse = await readJsonFixture(new URL('../../clients/__fixtures__/jira-create-response.json', import.meta.url))
const issueResponse = await readJsonFixture(new URL('../../clients/__fixtures__/jira-issue-response.json', import.meta.url))
const fixtureManifest = await readJsonFixture(new URL('ticket.json', fixturesUrl))
const fixtureDescription = (await readFile(new URL('description.jira.txt', fixturesUrl), 'utf8')).replace(/\n+$/, '')
const createTicketOutput = await readFile(new URL('create-ticket-output.txt', fixturesUrl), 'utf8')

const CREATED_URL = 'https://example.atlassian.net/browse/HEDY-201'

let root
let folder
let manifestPath

beforeEach(async () => {
  root = await createWorkspace()
  folder = await mkdtemp(join(tmpdir(), 'hedy-create-'))
  manifestPath = join(folder, 'ticket.json')
  await copyFile(new URL('ticket.json', fixturesUrl), manifestPath)
  await copyFile(new URL('description.jira.txt', fixturesUrl), join(folder, 'description.jira.txt'))
})

afterEach(async () => {
  await chmod(folder, 0o700)
  await rm(folder, { recursive: true, force: true })
  await rm(root, { recursive: true, force: true })
})

const receiptPath = () => join(folder, RECEIPT_FILENAME)
const readReceipt = async () => JSON.parse(await readFile(receiptPath(), 'utf8'))

const stageCreate = () => nock(ATLASSIAN_BASE_URL).post('/rest/api/2/issue', createRequest).reply(201, createResponse)
const stageReadBack = () => nock(ATLASSIAN_BASE_URL)
  .get('/rest/api/2/issue/HEDY-201')
  .query(true)
  .reply(200, { ...issueResponse, key: 'HEDY-201' })

const dryRun = () => runCreate({ from: manifestPath, env: {}, workspaceRoot: () => root })
const confirmCreate = (confirm) => runCreate({ from: manifestPath, confirm, env: credentialsEnv(), workspaceRoot: () => root })

const createConfirmed = async () => {
  const { planId } = await dryRun()
  stageCreate()
  stageReadBack()
  await confirmCreate(planId)
  return planId
}

describe('runCreate', () => {
  it('without confirm returns the dry run for the fixture manifest with no credentials, no .env and no request', async () => {
    expect(await dryRun()).toEqual({
      mode: 'dry-run',
      planId: expect.stringMatching(/^[0-9a-f]{64}$/),
      project: 'HEDY',
      type: 'Task',
      summary: fixtureManifest.summary,
      priority: 'Medium',
      parent: 'HEDY-100',
      labels: ['hedy', 'fixtures'],
      description: fixtureDescription,
      warnings: []
    })
    expect((await rejectionOf(readFile(receiptPath()))).code).toBe('ENOENT')
  })

  it('reads a --from path relative to the current folder', async () => {
    const result = await runCreate({ from: relative(process.cwd(), manifestPath), env: {}, workspaceRoot: () => root })
    expect(result.planId).toBe((await dryRun()).planId)
  })

  it('refuses a confirm with USAGE and sends no request when the description file changed after the dry run', async () => {
    const { planId } = await dryRun()
    await writeFile(join(folder, 'description.jira.txt'), 'h3. Why\n\nAnother reason.\n')
    const error = await rejectionOf(confirmCreate(planId))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe('The plan has changed since the dry run. Run the dry run again, then confirm the new plan id.')
    expect((await rejectionOf(readFile(receiptPath()))).code).toBe('ENOENT')
  })

  it('with the matching confirm sends the captured create body, writes the receipt, reads the issue back and returns created', async () => {
    const { planId } = await dryRun()
    stageCreate()
    stageReadBack()
    expect(await confirmCreate(planId)).toEqual({ mode: 'created', key: 'HEDY-201', url: CREATED_URL })
    const receipt = await readReceipt()
    expect(receipt).toEqual({ key: 'HEDY-201', url: CREATED_URL, planId, createdAt: expect.any(String) })
    expect(new Date(receipt.createdAt).toISOString()).toBe(receipt.createdAt)
    expect(await readFile(receiptPath(), 'utf8')).toBe(`${JSON.stringify(receipt, null, 2)}\n`)
  })

  it('keeps the receipt and rejects with NETWORK naming the created key and the receipt path when the read back answers 500', async () => {
    const { planId } = await dryRun()
    stageCreate()
    nock(ATLASSIAN_BASE_URL).get('/rest/api/2/issue/HEDY-201').query(true).reply(500, 'down')
    const error = await rejectionOf(confirmCreate(planId))
    expect(error.code).toBe('NETWORK')
    expect(error.cause.code).toBe('NETWORK')
    expect(error.message).toBe(`Jira created HEDY-201 at ${CREATED_URL} and the receipt is at ${receiptPath()}, but reading the issue back failed: ${error.cause.message} Run the same confirm again to read the issue back.`)
    expect(error.cause.message).toMatch(/^issue HEDY-201: Jira answered 500\./)
    expect(await readReceipt()).toMatchObject({ key: 'HEDY-201', url: CREATED_URL, planId })
  })

  it('on a second matching confirm reads the issue back, sends no create and returns unchanged', async () => {
    const planId = await createConfirmed()
    stageReadBack()
    expect(await confirmCreate(planId)).toEqual({ mode: 'unchanged', key: 'HEDY-201', url: CREATED_URL })
  })

  it('refuses a confirm of a changed manifest with USAGE naming the created key and the receipt path when the receipt exists', async () => {
    await createConfirmed()
    await writeFile(manifestPath, JSON.stringify({ ...fixtureManifest, summary: 'Raise another issue' }))
    const { planId } = await dryRun()
    const error = await rejectionOf(confirmCreate(planId))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`This manifest already created HEDY-201 at ${CREATED_URL}. To raise another issue, delete ${receiptPath()} or start a new folder.`)
  })

  it('rejects with UNKNOWN naming the created key, the receipt path and the receipt to write, and does not read back, when the receipt cannot be written', async () => {
    const { planId } = await dryRun()
    await chmod(folder, 0o500)
    stageCreate()
    const error = await rejectionOf(confirmCreate(planId))
    expect(error.code).toBe('UNKNOWN')
    const lead = `Jira created HEDY-201 at ${CREATED_URL}, but the receipt could not be written at ${receiptPath()}. Write this receipt into that file before running the command again: `
    expect(error.message.startsWith(lead)).toBe(true)
    expect(error.message).toContain(planId)
    expect(error.message).toContain('"createdAt"')
    expect(JSON.parse(error.message.slice(lead.length))).toEqual({ key: 'HEDY-201', url: CREATED_URL, planId, createdAt: expect.any(String) })
    expect(error.cause.code).toBe('EACCES')
  })

  it('refuses a receipt that is not JSON with USAGE naming the receipt path and sends no request', async () => {
    const { planId } = await dryRun()
    await writeFile(receiptPath(), 'not json')
    const error = await rejectionOf(confirmCreate(planId))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The receipt at ${receiptPath()} is not JSON. Check in Jira whether the manifest's issue exists, then fix or delete the receipt and run the command again.`)
  })

  it.each([
    ['null', () => null],
    ['the confirmed plan id without a key', (planId) => ({ planId })],
    ['an empty url', (planId) => ({ key: 'HEDY-201', url: '', planId, createdAt: '2026-10-28T10:00:00.000Z' })]
  ])('refuses a receipt holding %s with USAGE naming the receipt path and sends no request', async (_label, receiptFor) => {
    const { planId } = await dryRun()
    await writeFile(receiptPath(), JSON.stringify(receiptFor(planId)))
    const error = await rejectionOf(confirmCreate(planId))
    expect(error.code).toBe('USAGE')
    expect(error.message).toBe(`The receipt at ${receiptPath()} does not hold key, url, planId and createdAt. Check in Jira whether the manifest's issue exists, then fix or delete the receipt and run the command again.`)
  })
})

describe('createPlanRows', () => {
  it('gives the eight rows for the fixture plan with the labels joined and none for no warnings', async () => {
    const plan = await dryRun()
    expect(createPlanRows(plan)).toEqual([
      ['Plan id', plan.planId],
      ['Project', 'HEDY'],
      ['Type', 'Task'],
      ['Summary', fixtureManifest.summary],
      ['Priority', 'Medium'],
      ['Parent', 'HEDY-100'],
      ['Labels', 'hedy, fixtures'],
      ['Warnings', 'none']
    ])
  })

  it('gives one warning per line and none for a null priority and parent', async () => {
    const plan = { ...await dryRun(), priority: null, parent: null, warnings: ['First warning.', 'Second warning.'] }
    expect(createPlanRows(plan).slice(4)).toEqual([
      ['Priority', 'none'],
      ['Parent', 'none'],
      ['Labels', 'hedy, fixtures'],
      ['Warnings', 'First warning.\nSecond warning.']
    ])
  })
})

const harness = () => {
  const io = captureIo()
  const program = new Command().option('--json').exitOverride()
  register(program, { ...io, env: credentialsEnv(), workspaceRoot: () => root })
  return { program, ...io }
}

describe('the jira create command', () => {
  it.each([
    ['a plan id that is not 64 hex characters', ['--from', '/nonexistent/ticket.json', '--confirm', 'abc'], 'The plan id abc is not one a dry run printed. Run the dry run, then confirm the 64-character plan id it prints.'],
    ['an empty --from', ['--from', ''], '--from is empty. Give --from the path of a ticket manifest, then run the command again.']
  ])('refuses %s with one USAGE line before reading any file, exit 2', async (_label, args, message) => {
    const h = harness()
    await h.program.parseAsync(['create', ...args], { from: 'user' })
    expect(h.out).toEqual([])
    expect(h.err).toEqual([`${message}\n`])
    expect(h.codes).toEqual([2])
  })

  it('in text mode prints one aligned line per plan field, the description and the confirm step for a dry run', async () => {
    const h = harness()
    await h.program.parseAsync(['create', '--from', manifestPath], { from: 'user' })
    const { planId } = await dryRun()
    expect(h.out.join('')).toBe([
      `Plan id:  ${planId}`,
      'Project:  HEDY',
      'Type:     Task',
      `Summary:  ${fixtureManifest.summary}`,
      'Priority: Medium',
      'Parent:   HEDY-100',
      'Labels:   hedy, fixtures',
      'Warnings: none',
      '',
      fixtureDescription,
      '',
      `This is a dry run. Nothing was sent. Run the command again with --confirm ${planId} to create the issue.\n`
    ].join('\n'))
    expect(h.codes).toEqual([0])
  })

  it('in text mode prints the two lines the bash tool printed for a confirmed create', async () => {
    const { planId } = await dryRun()
    stageCreate()
    stageReadBack()
    const h = harness()
    await h.program.parseAsync(['create', '--from', manifestPath, '--confirm', planId], { from: 'user' })
    expect(h.out.join('')).toBe(createTicketOutput)
    expect(h.err).toEqual([])
    expect(h.codes).toEqual([0])
  })
})

describe('hedy jira create, spawned', () => {
  const childEnv = () => ({ HEDY_WORKSPACE: root, JIRA_USER: undefined, JIRA_TOKEN: undefined, JIRA_BASE_URL: undefined })

  it.each([
    ['with no --from', ['jira', 'create', '--json'], "'--from <path>'"],
    ['with a --from path that holds no manifest', ['jira', 'create', '--from', '/nonexistent/ticket.json', '--json'], '/nonexistent/ticket.json'],
    ['with a plan id that is not 64 hex characters', ['jira', 'create', '--from', '/nonexistent/ticket.json', '--confirm', 'abc', '--json'], 'The plan id abc']
  ])('%s gives one USAGE entry naming %s and exits 2', async (_label, args, fragment) => {
    const result = await runCli(args, { env: childEnv() })
    expect(result.exitCode).toBe(2)
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.errors.map(({ code }) => code)).toEqual(['USAGE'])
    expect(result.envelope.errors[0].message).toContain(fragment)
  })

  it('with the fixture manifest and no .env returns the dry run and exits 0', async () => {
    const result = await runCli(['jira', 'create', '--from', manifestPath, '--json'], { env: childEnv() })
    expect(result.exitCode).toBe(0)
    expect(result.envelope.ok).toBe(true)
    expect(result.envelope.result.mode).toBe('dry-run')
    expect(result.envelope.result.planId).toMatch(/^[0-9a-f]{64}$/)
  })
})
