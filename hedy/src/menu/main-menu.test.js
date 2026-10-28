import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { describe, it, expect, vi } from 'vitest'
import { renderPublish } from '../commands/confluence/publish.js'
import { HedyError } from '../errors.js'
import { captureIo } from '../test-support/io.js'
import { MainMenu } from './main-menu.js'
import { SCREENS } from './screens.js'

const fixtureUrl = (path) => new URL(path, import.meta.url)
const [issueProjection] = JSON.parse(await readFile(fixtureUrl('../clients/__fixtures__/jira-search-projection.json'), 'utf8'))
const pageResponse = JSON.parse(await readFile(fixtureUrl('../clients/__fixtures__/confluence-page-response.json'), 'utf8'))

const issue = { ...issueProjection, description: 'Line 1 of the description' }

const page = {
  id: pageResponse.id,
  title: pageResponse.title,
  space: pageResponse.space.key,
  version: { number: pageResponse.version.number, when: pageResponse.version.when, by: pageResponse.version.by.displayName },
  url: `https://example.atlassian.net/wiki/spaces/${pageResponse.space.key}/pages/${pageResponse.id}`,
  labels: pageResponse.metadata.labels.results.map(({ name }) => name),
  body: 'Line 1 of the page'
}

const pagePath = 'docs/systems/EUDP/publishing.md'

const publishFacts = {
  absolutePath: '/tmp/docs-repo/docs/systems/EUDP/publishing.md',
  page: pagePath,
  title: 'Publishing to Confluence',
  space: 'DOCS',
  existing: { id: '123456', url: 'https://example.atlassian.net/wiki/spaces/DOCS/pages/123456' }
}

const updatedResult = {
  mode: 'updated',
  page: pagePath,
  id: '123456',
  title: publishFacts.title,
  space: 'DOCS',
  url: publishFacts.existing.url,
  version: { number: 5, when: '2026-10-28T09:00:00.000Z', by: 'Ada Lovelace' },
  warnings: [],
  links: { checked: 3, pages: 1, broken: 0, unreachable: 0 }
}

const MAIN_ITEMS = ['Check the credentials', 'Jira', 'Confluence', 'Quit']

const DOWN = '\u001B[B'

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const flat = (frame) => frame.replace(/\s+/g, ' ')

const shown = (lastFrame, text) => vi.waitFor(() => expect(lastFrame()).toContain(text))

const press = async (stdin, ...keys) => {
  for (const key of keys) {
    await pause()
    stdin.write(key)
  }
}

const chooseItem = async ({ stdin, lastFrame }, { on, index }) => {
  await shown(lastFrame, on)
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

const renderMenu = (props = {}) => {
  const quits = []
  const io = captureIo()
  const instance = render(createElement(MainMenu, {
    env: {},
    workspaceRoot: () => tmpdir(),
    io,
    detach: () => () => {},
    onQuit: () => { quits.push('quit') },
    ...props
  }))
  return { ...instance, io, quits }
}

describe('MainMenu', () => {
  it('opens on the hedy title, its subtitle and the four items in order', () => {
    const { lastFrame } = renderMenu()
    const frame = lastFrame()
    expect(frame).toContain('hedy')
    expect(frame).toContain('Choose what to do')
    const positions = MAIN_ITEMS.map((label) => frame.indexOf(label))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((first, second) => first - second))
  })

  it('runs the injected check from Check the credentials, shows both display names, and Enter returns to the main menu', async () => {
    const checks = []
    const menu = renderMenu({
      checkCredentials: async () => {
        checks.push('check')
        return { jira: { displayName: 'Ada Lovelace' }, confluence: { displayName: 'Grace Hopper' } }
      }
    })
    await chooseItem(menu, { on: 'Quit', index: 0 })
    await shown(menu.lastFrame, 'Credentials')
    expect(menu.lastFrame()).toContain('Jira:       ok as Ada Lovelace')
    expect(menu.lastFrame()).toContain('Confluence: ok as Grace Hopper')
    expect(checks).toEqual(['check'])
    await press(menu.stdin, '\r')
    await shown(menu.lastFrame, 'Check the credentials')
  })

  it('reads the issue for the key typed under Jira, Read an issue, and shows the issue', async () => {
    const read = recorder(() => issue)
    const menu = renderMenu({ readIssue: read.fake })
    await chooseItem(menu, { on: 'Quit', index: 1 })
    await chooseItem(menu, { on: 'Read an issue', index: 0 })
    await submit(menu, 'Issue key', 'HEDY-101')
    await shown(menu.lastFrame, 'HEDY-101  Capture the read projections as fixtures')
    expect(read.calls).toEqual([{ key: 'HEDY-101' }])
    expect(menu.lastFrame()).toContain('Status:   In Progress')
    expect(menu.lastFrame()).toContain('Line 1 of the description')
  })

  it('reads the page for the reference typed under Confluence, Read a page, and shows the page', async () => {
    const read = recorder(() => page)
    const menu = renderMenu({ readPage: read.fake })
    await chooseItem(menu, { on: 'Quit', index: 2 })
    await chooseItem(menu, { on: 'Read a page', index: 0 })
    await submit(menu, 'Page id, URL or share link', '123456')
    await shown(menu.lastFrame, page.title)
    expect(read.calls).toEqual([{ reference: '123456' }])
    expect(menu.lastFrame()).toContain('Space:   DOCS')
    expect(menu.lastFrame()).toContain('Line 1 of the page')
  })

  it('gives the description file field a fresh input, so describe receives the typed key and the typed path alone', async () => {
    const descriptionPath = '.claude/workareas/jira/HEDY-101/description.jira.txt'
    const describe = recorder(() => ({
      mode: 'dry-run',
      planId: '0123456789abcdef'.repeat(4),
      key: 'HEDY-101',
      url: 'https://example.atlassian.net/browse/HEDY-101',
      description: 'Line 1 of the description',
      unchanged: false
    }))
    const menu = renderMenu({ describeIssue: describe.fake })
    await chooseItem(menu, { on: 'Quit', index: 1 })
    await chooseItem(menu, { on: 'Read an issue', index: 3 })
    await submit(menu, 'Issue key', 'HEDY-101')
    await submit(menu, 'Description file', descriptionPath)
    await shown(menu.lastFrame, 'Replace the description?')
    expect(describe.calls).toEqual([{ key: 'HEDY-101', from: descriptionPath }])
  })

  it('shows the error screen with the code and message of a thrown HedyError, and Enter returns to the main menu', async () => {
    const message = 'issue HEDY-999: Jira has no such issue. Check the key, then try again.'
    const read = recorder(() => { throw new HedyError('NOT_FOUND', message) })
    const menu = renderMenu({ readIssue: read.fake })
    await chooseItem(menu, { on: 'Quit', index: 1 })
    await chooseItem(menu, { on: 'Read an issue', index: 0 })
    await submit(menu, 'Issue key', 'HEDY-999')
    await shown(menu.lastFrame, 'Something went wrong')
    expect(flat(menu.lastFrame())).toContain(`NOT_FOUND ${message}`)
    await press(menu.stdin, '\r')
    await shown(menu.lastFrame, 'Check the credentials')
  })

  it('opens on the initial screen it is given and renders nothing for a screen with no route', () => {
    expect(renderMenu({ initialScreen: SCREENS.JIRA_MENU }).lastFrame()).toContain('Read an issue')
    expect(renderMenu({ initialScreen: 'no-such-screen' }).lastFrame()).toBe('')
  })

  it('calls onQuit when you choose Quit', async () => {
    const menu = renderMenu()
    await chooseItem(menu, { on: 'Quit', index: 3 })
    await vi.waitFor(() => expect(menu.quits).toEqual(['quit']))
  })

  it('detaches once on y at the publish confirm and prints the outcome through io', async () => {
    const detaches = []
    const settled = []
    const publish = recorder(async ({ confirm }) => {
      await confirm(publishFacts)
      return updatedResult
    })
    const menu = renderMenu({
      publishPage: publish.fake,
      detach: () => {
        detaches.push('detach')
        return (code) => { settled.push(code) }
      }
    })
    await chooseItem(menu, { on: 'Quit', index: 2 })
    await chooseItem(menu, { on: 'Read a page', index: 1 })
    await submit(menu, 'Page path', pagePath)
    await shown(menu.lastFrame, 'Publish the page?')
    await press(menu.stdin, 'y')
    await vi.waitFor(() => expect(settled).toEqual([0]))
    expect(detaches).toEqual(['detach'])
    expect(publish.calls.map(({ page: given }) => given)).toEqual([pagePath])
    expect(menu.io.out).toEqual([`${renderPublish(updatedResult)}\n`])
  })

  it('leaves the hook default in place for an override not given, so an invalid reference shows the USAGE error without a network call', async () => {
    const menu = renderMenu()
    await chooseItem(menu, { on: 'Quit', index: 2 })
    await chooseItem(menu, { on: 'Read a page', index: 0 })
    await submit(menu, 'Page id, URL or share link', 'not-a-page')
    await shown(menu.lastFrame, 'Something went wrong')
    expect(menu.lastFrame()).toContain('USAGE')
    expect(flat(menu.lastFrame())).toContain('The reference not-a-page is not a Confluence page.')
  })
})
