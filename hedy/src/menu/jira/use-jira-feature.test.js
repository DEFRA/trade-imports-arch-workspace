import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { HedyError } from '../../errors.js'
import { FeatureHarness } from '../../test-support/menu-harness.js'
import { SCREENS } from '../screens.js'
import { useJiraFeature } from './use-jira-feature.js'

const fixtureUrl = (path) => new URL(path, import.meta.url)
const [issueProjection, bareIssueProjection] = JSON.parse(
  await readFile(fixtureUrl('../../clients/__fixtures__/jira-search-projection.json'), 'utf8')
)
const manifestDescription = await readFile(fixtureUrl('../../commands/jira/__fixtures__/description.jira.txt'), 'utf8')

const longDescription = Array.from({ length: 25 }, (_, index) => `Line ${index + 1} of the description`).join('\n')

const PLAN_ID = '0123456789abcdef'.repeat(4)
const MANIFEST_PATH = '.claude/workareas/jira/hedy-manifest/ticket.json'
const DESCRIPTION_PATH = '.claude/workareas/jira/HEDY-101/description.jira.txt'

const createPlan = {
  mode: 'dry-run',
  planId: PLAN_ID,
  project: 'HEDY',
  type: 'Task',
  summary: 'Raise Jira issues from a manifest with a dry run',
  priority: 'Medium',
  parent: 'HEDY-100',
  labels: ['hedy', 'fixtures'],
  description: manifestDescription.trimEnd(),
  warnings: []
}

const describePlan = {
  mode: 'dry-run',
  planId: PLAN_ID,
  key: 'HEDY-101',
  url: 'https://example.atlassian.net/browse/HEDY-101',
  description: longDescription,
  unchanged: false
}

const DOWN = '\u001B[B'

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const flat = (frame) => frame.replace(/\s+/g, ' ')

const press = async (stdin, ...keys) => {
  for (const key of keys) {
    await pause()
    stdin.write(key)
  }
}

const shown = (lastFrame, text) => vi.waitFor(() => expect(lastFrame()).toContain(text))

const chooseItem = async ({ stdin, lastFrame }, index) => {
  await shown(lastFrame, 'Choose what to do')
  await press(stdin, ...Array(index).fill(DOWN), '\r')
}

const submit = async ({ stdin, lastFrame }, label, text) => {
  await shown(lastFrame, `${label}: `)
  await press(stdin, text, '\r')
}

const recorder = (answer) => {
  const calls = []
  const fake = async (request) => {
    calls.push(request)
    return answer(request)
  }
  return { calls, fake }
}

const planThenOutcome = (plan, outcome) => recorder(({ confirm }) => confirm === undefined ? plan : outcome)

const renderJira = (options, { initialScreen = SCREENS.JIRA_MENU, onMount } = {}) => {
  const returns = []
  const instance = render(createElement(FeatureHarness, {
    useFeature: useJiraFeature,
    initialScreen,
    options,
    navigateToMain: () => { returns.push('main') },
    onMount
  }))
  return { ...instance, returns }
}

describe('useJiraFeature', () => {
  it('opens the Jira menu with its five items from the main menu, and Back returns to the main menu', async () => {
    const { lastFrame, stdin, returns } = renderJira({}, {
      initialScreen: SCREENS.MAIN,
      onMount: (feature) => { feature.handleMainMenuSelect() }
    })
    await vi.waitFor(() => expect(lastFrame()).toContain('Choose what to do'))
    const frame = lastFrame()
    for (const text of ['Jira', 'Choose what to do', 'Read an issue', 'Search issues', 'Create an issue from a manifest', "Replace an issue's description", 'Back']) {
      expect(frame).toContain(text)
    }
    await chooseItem({ stdin, lastFrame }, 4)
    await vi.waitFor(() => expect(returns).toEqual(['main']))
  })

  it('reads the issue for the key you type and shows the key, the summary, the rows and the first 20 lines of the description with a note', async () => {
    const read = recorder(() => ({ ...issueProjection, description: longDescription }))
    const { lastFrame, stdin } = renderJira({ readIssue: read.fake })
    await chooseItem({ stdin, lastFrame }, 0)
    await submit({ stdin, lastFrame }, 'Issue key', 'HEDY-101')
    await vi.waitFor(() => expect(lastFrame()).toContain('HEDY-101  Capture the read projections as fixtures'))
    const frame = lastFrame()
    expect(read.calls).toEqual([{ key: 'HEDY-101' }])
    expect(frame).toContain('Status:   In Progress')
    expect(frame).toContain('Labels:   fixtures, hedy')
    expect(frame).toContain('Line 1 of the description')
    expect(frame).toContain('Line 20 of the description')
    expect(frame).not.toContain('Line 21 of the description')
    expect(flat(frame)).toContain('5 more lines. Run hedy jira ticket HEDY-101 to read the whole description.')
  })

  it('shows "(no description)" and no note for an issue with no description', async () => {
    const read = recorder(() => ({ ...bareIssueProjection, description: null }))
    const { lastFrame, stdin } = renderJira({ readIssue: read.fake })
    await chooseItem({ stdin, lastFrame }, 0)
    await submit({ stdin, lastFrame }, 'Issue key', 'HEDY-102')
    await vi.waitFor(() => expect(lastFrame()).toContain('HEDY-102  Write the markdown converter tests'))
    expect(lastFrame()).toContain('(no description)')
    expect(lastFrame()).not.toContain('more lines')
  })

  it('shows the error screen with the message when the issue is not found', async () => {
    const read = recorder(() => {
      throw new HedyError('NOT_FOUND', 'issue HEDY-999: Jira has no such issue. Check the key, then try again.')
    })
    const { lastFrame, stdin } = renderJira({ readIssue: read.fake })
    await chooseItem({ stdin, lastFrame }, 0)
    await submit({ stdin, lastFrame }, 'Issue key', 'HEDY-999')
    await vi.waitFor(() => expect(lastFrame()).toContain('Something went wrong'))
    expect(flat(lastFrame())).toContain('NOT_FOUND issue HEDY-999: Jira has no such issue. Check the key, then try again.')
  })

  it('searches with the query you type and max 20, and shows one row per issue with none for a missing status', async () => {
    const search = recorder(() => ({ issues: [issueProjection, { ...bareIssueProjection, status: null }], truncated: false }))
    const { lastFrame, stdin } = renderJira({ searchIssues: search.fake })
    await chooseItem({ stdin, lastFrame }, 1)
    await submit({ stdin, lastFrame }, 'JQL query', 'project = HEDY')
    await vi.waitFor(() => expect(lastFrame()).toContain('Issues'))
    const frame = lastFrame()
    expect(search.calls).toEqual([{ jql: 'project = HEDY', max: 20 }])
    expect(frame).toContain('HEDY-101: In Progress  Capture the read projections as fixtures')
    expect(frame).toContain('HEDY-102: none  Write the markdown converter tests')
    expect(frame).not.toContain('More issues match')
  })

  it('says that no issues match when the search finds none', async () => {
    const search = recorder(() => ({ issues: [], truncated: false }))
    const { lastFrame, stdin } = renderJira({ searchIssues: search.fake })
    await chooseItem({ stdin, lastFrame }, 1)
    await submit({ stdin, lastFrame }, 'JQL query', 'project = NONE')
    await vi.waitFor(() => expect(lastFrame()).toContain('No issues match the query.'))
  })

  it('names the command for the rest when more issues match than the search returned', async () => {
    const search = recorder(() => ({ issues: [issueProjection], truncated: true }))
    const { lastFrame, stdin } = renderJira({ searchIssues: search.fake })
    await chooseItem({ stdin, lastFrame }, 1)
    await submit({ stdin, lastFrame }, 'JQL query', 'project = HEDY')
    await vi.waitFor(() => expect(lastFrame()).toContain('HEDY-101'))
    expect(flat(lastFrame())).toContain('More issues match. Run hedy jira search with a higher --max to read them.')
  })

  it('reads the create plan for the manifest you name without a confirm and shows its rows and description', async () => {
    const create = planThenOutcome(createPlan, {})
    const { lastFrame, stdin } = renderJira({ createIssue: create.fake })
    await chooseItem({ stdin, lastFrame }, 2)
    await submit({ stdin, lastFrame }, 'Manifest path', MANIFEST_PATH)
    await vi.waitFor(() => expect(lastFrame()).toContain('Create the issue?'))
    const frame = lastFrame()
    expect(create.calls).toStrictEqual([{ from: MANIFEST_PATH }])
    for (const text of [
      'Create an issue',
      `Plan id:  ${PLAN_ID}`,
      'Summary:  Raise Jira issues from a manifest with a dry run',
      'Labels:   hedy, fixtures',
      'Warnings: none',
      'h3. Why',
      '# Confirm with the exact plan id.'
    ]) expect(frame).toContain(text)
    expect(frame).not.toContain('more lines')
  })

  it('returns to the main menu on n at the create confirm and sends no second call', async () => {
    const create = planThenOutcome(createPlan, {})
    const { lastFrame, stdin, returns } = renderJira({ createIssue: create.fake })
    await chooseItem({ stdin, lastFrame }, 2)
    await submit({ stdin, lastFrame }, 'Manifest path', MANIFEST_PATH)
    await vi.waitFor(() => expect(lastFrame()).toContain('Create the issue?'))
    await press(stdin, 'n')
    await vi.waitFor(() => expect(returns).toEqual(['main']))
    await pause()
    expect(create.calls).toHaveLength(1)
  })

  it('creates the issue with the plan id on y and shows the outcome rows', async () => {
    const create = planThenOutcome(createPlan, { mode: 'created', key: 'HEDY-201', url: 'https://example.atlassian.net/browse/HEDY-201' })
    const { lastFrame, stdin } = renderJira({ createIssue: create.fake })
    await chooseItem({ stdin, lastFrame }, 2)
    await submit({ stdin, lastFrame }, 'Manifest path', MANIFEST_PATH)
    await vi.waitFor(() => expect(lastFrame()).toContain('Create the issue?'))
    await press(stdin, 'y')
    await vi.waitFor(() => expect(lastFrame()).toContain('Created: https://example.atlassian.net/browse/HEDY-201'))
    expect(lastFrame()).toContain('Issue:   HEDY-201')
    expect(create.calls).toStrictEqual([{ from: MANIFEST_PATH }, { from: MANIFEST_PATH, confirm: PLAN_ID }])
  })

  it('shows the error screen when the confirmed create is refused as USAGE', async () => {
    const create = recorder(({ confirm }) => {
      if (confirm === undefined) return createPlan
      throw new HedyError('USAGE', 'The plan has changed since the dry run. Run the dry run again, then confirm the new plan id.')
    })
    const { lastFrame, stdin } = renderJira({ createIssue: create.fake })
    await chooseItem({ stdin, lastFrame }, 2)
    await submit({ stdin, lastFrame }, 'Manifest path', MANIFEST_PATH)
    await vi.waitFor(() => expect(lastFrame()).toContain('Create the issue?'))
    await press(stdin, 'y')
    await vi.waitFor(() => expect(lastFrame()).toContain('Something went wrong'))
    expect(flat(lastFrame())).toContain('USAGE The plan has changed since the dry run. Run the dry run again, then confirm the new plan id.')
  })

  it('takes the key, then the file, reads the replace plan without a confirm, and replaces the description with the plan id on y', async () => {
    const describeCall = planThenOutcome(describePlan, { mode: 'updated', key: 'HEDY-101', url: describePlan.url })
    const { lastFrame, stdin } = renderJira({ describeIssue: describeCall.fake })
    await chooseItem({ stdin, lastFrame }, 3)
    await submit({ stdin, lastFrame }, 'Issue key', 'HEDY-101')
    await submit({ stdin, lastFrame }, 'Description file', DESCRIPTION_PATH)
    await vi.waitFor(() => expect(lastFrame()).toContain('Replace the description?'))
    const frame = lastFrame()
    expect(describeCall.calls).toStrictEqual([{ key: 'HEDY-101', from: DESCRIPTION_PATH }])
    for (const text of [
      `Plan id:   ${PLAN_ID}`,
      'Issue:     HEDY-101',
      'Unchanged: no',
      'Line 20 of the description'
    ]) expect(frame).toContain(text)
    expect(frame).not.toContain('Line 21 of the description')
    expect(flat(frame)).toContain(`5 more lines. Run hedy jira describe HEDY-101 --from ${DESCRIPTION_PATH} to read the whole plan.`)
    await press(stdin, 'y')
    await vi.waitFor(() => expect(lastFrame()).toContain(`Updated: ${describePlan.url}`))
    expect(describeCall.calls).toStrictEqual([
      { key: 'HEDY-101', from: DESCRIPTION_PATH },
      { key: 'HEDY-101', from: DESCRIPTION_PATH, confirm: PLAN_ID }
    ])
  })

  it.each([
    ['the issue key to read', SCREENS.JIRA_TICKET_INPUT],
    ['the JQL query', SCREENS.JIRA_SEARCH_INPUT],
    ['the manifest path', SCREENS.JIRA_CREATE_INPUT],
    ['the issue key to replace a description on', SCREENS.JIRA_DESCRIBE_KEY_INPUT],
    ['the description file', SCREENS.JIRA_DESCRIBE_FILE_INPUT]
  ])('returns to the main menu and calls nothing on a blank %s', async (_input, screen) => {
    const calls = recorder(() => ({}))
    const { stdin, returns } = renderJira({
      readIssue: calls.fake,
      searchIssues: calls.fake,
      createIssue: calls.fake,
      describeIssue: calls.fake
    }, { initialScreen: screen })
    await press(stdin, '\r')
    await vi.waitFor(() => expect(returns).toEqual(['main']))
    expect(calls.calls).toEqual([])
  })

  describe('with the default commands', () => {
    let root

    beforeEach(async () => {
      root = await mkdtemp(join(tmpdir(), 'hedy-menu-jira-'))
      await copyFile(fixtureUrl('../../commands/jira/__fixtures__/ticket.json'), join(root, 'ticket.json'))
      await copyFile(fixtureUrl('../../commands/jira/__fixtures__/description.jira.txt'), join(root, 'description.jira.txt'))
    })

    afterEach(async () => {
      await rm(root, { recursive: true, force: true })
    })

    it.each([
      ['Read an issue', 0, () => [['Issue key', 'HEDY-101']]],
      ['Search issues', 1, () => [['JQL query', 'project = HEDY']]],
      ["Replace an issue's description", 3, () => [['Issue key', 'HEDY-101'], ['Description file', join(root, 'description.jira.txt')]]]
    ])('%s runs its command with the env and workspace root, so missing credentials show the AUTH error', async (_item, index, inputsOf) => {
      const { lastFrame, stdin } = renderJira({ env: {}, workspaceRoot: () => root })
      await chooseItem({ stdin, lastFrame }, index)
      for (const [label, input] of inputsOf()) await submit({ stdin, lastFrame }, label, input)
      await vi.waitFor(() => expect(lastFrame()).toContain('Something went wrong'))
      expect(flat(lastFrame())).toContain('AUTH JIRA_USER, JIRA_TOKEN and JIRA_BASE_URL are not set')
    })

    it.each([
      ['Read an issue', 0, () => [['Issue key', 'eudpa 123']]],
      ["Replace an issue's description", 3, () => [['Issue key', 'eudpa 123'], ['Description file', join(root, 'description.jira.txt')]]]
    ])('%s refuses a key that is not an issue key with USAGE and the key rule, before the credentials are read', async (_item, index, inputsOf) => {
      const { lastFrame, stdin } = renderJira({ env: {}, workspaceRoot: () => root })
      await chooseItem({ stdin, lastFrame }, index)
      for (const [label, input] of inputsOf()) await submit({ stdin, lastFrame }, label, input)
      await vi.waitFor(() => expect(lastFrame()).toContain('Something went wrong'))
      expect(flat(lastFrame())).toContain('USAGE The key eudpa 123 is not a Jira issue key such as ABC-123. Give the key of one issue, then run the command again.')
    })

    it('Create an issue from a manifest runs the create command, which shows the manifest plan without credentials', async () => {
      const { lastFrame, stdin } = renderJira({ env: {}, workspaceRoot: () => root })
      await chooseItem({ stdin, lastFrame }, 2)
      await submit({ stdin, lastFrame }, 'Manifest path', join(root, 'ticket.json'))
      await vi.waitFor(() => expect(lastFrame()).toContain('Create the issue?'))
      const frame = lastFrame()
      expect(frame).toContain('Project:  HEDY')
      expect(frame).toContain('Summary:  Raise Jira issues from a manifest with a dry run')
      expect(frame).toContain('h3. Why')
    })
  })
})
