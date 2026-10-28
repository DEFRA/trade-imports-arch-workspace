import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { describe, it, expect, vi } from 'vitest'
import { renderPublish } from '../../commands/confluence/publish.js'
import { HedyError } from '../../errors.js'
import { captureIo } from '../../test-support/io.js'
import { FeatureHarness } from '../../test-support/menu-harness.js'
import { SCREENS } from '../screens.js'
import { useConfluenceFeature } from './use-confluence-feature.js'

const pageResponse = JSON.parse(await readFile(new URL('../../clients/__fixtures__/confluence-page-response.json', import.meta.url), 'utf8'))

const longBody = Array.from({ length: 25 }, (_, index) => `Line ${index + 1}`).join('\n')

const page = {
  id: pageResponse.id,
  title: pageResponse.title,
  space: pageResponse.space.key,
  version: { number: pageResponse.version.number, when: pageResponse.version.when, by: pageResponse.version.by.displayName },
  url: `https://example.atlassian.net/wiki/spaces/${pageResponse.space.key}/pages/${pageResponse.id}`,
  labels: pageResponse.metadata.labels.results.map(({ name }) => name),
  body: longBody
}

const pagePath = 'docs/systems/EUDP/publishing.md'

const existingFacts = {
  absolutePath: '/tmp/docs-repo/docs/systems/EUDP/publishing.md',
  page: pagePath,
  title: 'Publishing to Confluence',
  space: 'DOCS',
  existing: { id: '123456', url: 'https://example.atlassian.net/wiki/spaces/DOCS/pages/123456' }
}

const newFacts = { ...existingFacts, existing: undefined }

const cancelledResult = { mode: 'cancelled', page: pagePath, title: existingFacts.title, space: 'DOCS' }

const updatedResult = {
  mode: 'updated',
  page: pagePath,
  id: '123456',
  title: existingFacts.title,
  space: 'DOCS',
  url: existingFacts.existing.url,
  version: { number: 5, when: '2026-10-28T09:00:00.000Z', by: 'Ada Lovelace' },
  warnings: ['The page has no diagrams to export.'],
  links: { checked: 3, pages: 1, broken: 0, unreachable: 0 }
}

const networkError = new HedyError('NETWORK', 'The publisher did not finish within 10 minutes and was stopped. Check the page in Confluence, then run the command again.')

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const flat = (text) => text.replace(/\s+/g, ' ')

const renderFeature = ({ answerRead = async () => page, answerPublish = () => new Promise(() => {}) } = {}) => {
  const io = captureIo()
  const reads = []
  const publishes = []
  const detaches = []
  const settled = []
  const returns = []
  const detach = () => {
    detaches.push('detach')
    return (code) => { settled.push(code) }
  }
  const readPage = (parameters) => {
    reads.push(parameters)
    return answerRead(parameters)
  }
  const publishPage = (parameters) => {
    publishes.push(parameters)
    return answerPublish(parameters, { detaches })
  }
  const instance = render(createElement(FeatureHarness, {
    useFeature: useConfluenceFeature,
    initialScreen: SCREENS.CONFLUENCE_MENU,
    navigateToMain: () => { returns.push('main') },
    options: { io, detach, readPage, publishPage }
  }))
  return { ...instance, io, reads, publishes, detaches, settled, returns }
}

const chooseItem = async (stdin, downPresses) => {
  await pause()
  for (let press = 0; press < downPresses; press += 1) {
    stdin.write('\u001B[B')
    await pause()
  }
  stdin.write('\r')
}

const typeThenEnter = async (stdin, text) => {
  await pause()
  if (text !== '') {
    stdin.write(text)
    await pause()
  }
  stdin.write('\r')
}

const openInput = async ({ stdin, lastFrame }, downPresses, label) => {
  await chooseItem(stdin, downPresses)
  await vi.waitFor(() => expect(lastFrame()).toContain(label))
}

const openPublishConfirm = async (feature) => {
  await openInput(feature, 1, 'Page path')
  await typeThenEnter(feature.stdin, pagePath)
  await vi.waitFor(() => expect(feature.lastFrame()).toContain('Publish the page?'))
}

const answerConfirm = async (stdin, key) => {
  await pause()
  stdin.write(key)
}

const publishAfterConfirm = (facts, answers, publishedOutcome) => async ({ confirm }, { detaches }) => {
  const confirmed = await confirm(facts)
  answers.push({ confirmed, detachesSeen: detaches.length })
  if (!confirmed) return cancelledResult
  return publishedOutcome()
}

describe('useConfluenceFeature', () => {
  it('lists Read a page, Publish a docs page and Back under the title and subtitle', () => {
    const { lastFrame } = renderFeature()
    for (const text of ['Confluence', 'Choose what to do', 'Read a page', 'Publish a docs page', 'Back']) {
      expect(lastFrame()).toContain(text)
    }
  })

  it('opens the Confluence menu from another screen through handleMainMenuSelect', async () => {
    const { lastFrame } = render(createElement(FeatureHarness, {
      useFeature: useConfluenceFeature,
      initialScreen: SCREENS.MAIN,
      options: { io: captureIo(), detach: () => {} },
      onMount: (feature) => feature.handleMainMenuSelect()
    }))
    await vi.waitFor(() => expect(lastFrame()).toContain('Publish a docs page'))
  })

  it('calls navigateToMain when you choose Back', async () => {
    const { stdin, returns } = renderFeature()
    await chooseItem(stdin, 2)
    await vi.waitFor(() => expect(returns).toEqual(['main']))
  })

  it('reads the page you name and shows its title, rows, first 20 body lines and the note', async () => {
    const feature = renderFeature()
    await openInput(feature, 0, 'Page id, URL or share link')
    await typeThenEnter(feature.stdin, '123456')
    await vi.waitFor(() => expect(feature.lastFrame()).toContain(page.title))
    expect(feature.reads).toEqual([{ reference: '123456' }])
    const frame = feature.lastFrame()
    for (const text of [
      'Space:   DOCS',
      'Version: 4 (2026-10-20T10:30:00.000Z)',
      'By:      Ada Lovelace',
      'Source:  https://example.atlassian.net/wiki/spaces/DOCS/pages/123456',
      'Line 1',
      'Line 20',
      '5 more lines. Run hedy confluence page 123456 to read the whole page.'
    ]) expect(frame).toContain(text)
    expect(frame).not.toContain('Line 21')
  })

  it('shows the whole body of a page that fits and no note', async () => {
    const feature = renderFeature({ answerRead: async () => ({ ...page, body: 'Line 1\nLine 2' }) })
    await openInput(feature, 0, 'Page id, URL or share link')
    await typeThenEnter(feature.stdin, '123456')
    await vi.waitFor(() => expect(feature.lastFrame()).toContain('Line 2'))
    expect(feature.lastFrame()).not.toContain('more lines')
  })

  it('shows the reading message while the page loads', async () => {
    const feature = renderFeature({ answerRead: () => new Promise(() => {}) })
    await openInput(feature, 0, 'Page id, URL or share link')
    await typeThenEnter(feature.stdin, '123456')
    await vi.waitFor(() => expect(feature.lastFrame()).toContain('Reading the page'))
  })

  it('shows the error screen with the code and message of a NOT_FOUND read', async () => {
    const message = 'Confluence holds no page with the id 999. Check the id, then try again.'
    const feature = renderFeature({ answerRead: async () => { throw new HedyError('NOT_FOUND', message) } })
    await openInput(feature, 0, 'Page id, URL or share link')
    await typeThenEnter(feature.stdin, '999')
    await vi.waitFor(() => expect(feature.lastFrame()).toContain('Something went wrong'))
    expect(feature.lastFrame()).toContain('NOT_FOUND')
    expect(flat(feature.lastFrame())).toContain(message)
  })

  it('shows the checking message and calls publishPage once with the path and a confirm function', async () => {
    const feature = renderFeature()
    await openInput(feature, 1, 'Page path')
    await typeThenEnter(feature.stdin, pagePath)
    await vi.waitFor(() => expect(feature.lastFrame()).toContain('Checking the page'))
    expect(feature.publishes.map(({ page: given, confirm }) => [given, typeof confirm])).toEqual([[pagePath, 'function']])
  })

  it.each([
    ['an existing page', existingFacts, `Confluence: holds the page at ${existingFacts.existing.url}; the publisher will update it`],
    ['no page', newFacts, 'Confluence: holds no page with this title; the publisher will create it']
  ])('shows the confirm screen for %s with the page, title, space and Confluence line', async (_case, facts, confluenceLine) => {
    const feature = renderFeature({ answerPublish: publishAfterConfirm(facts, [], async () => updatedResult) })
    await openPublishConfirm(feature)
    const frame = flat(feature.lastFrame())
    for (const text of [
      'Publish a page',
      `Page: ${pagePath}`,
      `Title: ${facts.title}`,
      'Space: DOCS',
      confluenceLine,
      'Publish the page? y/N'
    ]) expect(frame).toContain(text)
  })

  it('on n resolves confirm false, returns to the main menu and never detaches', async () => {
    const answers = []
    const feature = renderFeature({ answerPublish: publishAfterConfirm(existingFacts, answers, async () => updatedResult) })
    await openPublishConfirm(feature)
    await answerConfirm(feature.stdin, 'n')
    await vi.waitFor(() => expect(feature.returns).toEqual(['main']))
    expect(answers).toEqual([{ confirmed: false, detachesSeen: 0 }])
    expect(feature.detaches).toEqual([])
    expect(feature.io.out).toEqual([])
    expect(feature.io.codes).toEqual([])
  })

  it('on y detaches once before confirm resolves true, prints the updated text and settles 0', async () => {
    const answers = []
    const feature = renderFeature({ answerPublish: publishAfterConfirm(existingFacts, answers, async () => updatedResult) })
    await openPublishConfirm(feature)
    await answerConfirm(feature.stdin, 'y')
    await vi.waitFor(() => expect(feature.settled).toEqual([0]))
    expect(answers).toEqual([{ confirmed: true, detachesSeen: 1 }])
    expect(feature.detaches).toEqual(['detach'])
    expect(feature.io.out).toEqual([`${renderPublish(updatedResult)}\n`])
    expect(feature.io.err).toEqual([])
    expect(feature.io.codes).toEqual([0])
    expect(feature.returns).toEqual([])
  })

  it('on y followed by a NETWORK rejection prints the message on stderr and settles 1', async () => {
    const answers = []
    const feature = renderFeature({ answerPublish: publishAfterConfirm(existingFacts, answers, async () => { throw networkError }) })
    await openPublishConfirm(feature)
    await answerConfirm(feature.stdin, 'y')
    await vi.waitFor(() => expect(feature.settled).toEqual([1]))
    expect(feature.io.err).toEqual([`${networkError.message}\n`])
    expect(feature.io.out).toEqual([])
    expect(feature.io.codes).toEqual([1])
    expect(feature.detaches).toEqual(['detach'])
  })

  it('shows the error screen and never detaches when publishPage rejects before the confirm', async () => {
    const message = 'The page docs/systems/EUDP/publishing.md is not listed in publishPaths. Add an entry, then run the command again.'
    const feature = renderFeature({ answerPublish: async () => { throw new HedyError('USAGE', message) } })
    await openInput(feature, 1, 'Page path')
    await typeThenEnter(feature.stdin, pagePath)
    await vi.waitFor(() => expect(feature.lastFrame()).toContain('Something went wrong'))
    expect(feature.lastFrame()).toContain('USAGE')
    expect(flat(feature.lastFrame())).toContain(message)
    expect(feature.detaches).toEqual([])
    expect(feature.settled).toEqual([])
    expect(feature.io.err).toEqual([])
  })

  it.each([
    ['Read a page', 0, 'Page id, URL or share link', '123456'],
    ['Publish a docs page', 1, 'Page path', 'docs/systems/<system>/<folder>/<page>.md']
  ])('the input under %s shows its subtitle and placeholder, and a blank submit calls navigateToMain and no command', async (item, downPresses, label, placeholder) => {
    const feature = renderFeature()
    await openInput(feature, downPresses, label)
    expect(feature.lastFrame()).toContain(item)
    expect(feature.lastFrame()).toContain(placeholder)
    await typeThenEnter(feature.stdin, '')
    await vi.waitFor(() => expect(feature.returns).toEqual(['main']))
    expect(feature.reads).toEqual([])
    expect(feature.publishes).toEqual([])
  })

  describe('with the default boundary functions', () => {
    const renderWithDefaults = (workspaceRoot) => {
      const io = captureIo()
      const detaches = []
      const instance = render(createElement(FeatureHarness, {
        useFeature: useConfluenceFeature,
        initialScreen: SCREENS.CONFLUENCE_MENU,
        options: { env: {}, workspaceRoot: () => workspaceRoot, io, detach: () => { detaches.push('detach') } }
      }))
      return { ...instance, io, detaches }
    }

    it('reads through runPage, whose USAGE refusal of a reference that is not a page shows on the error screen', async () => {
      const feature = renderWithDefaults(tmpdir())
      await openInput(feature, 0, 'Page id, URL or share link')
      await typeThenEnter(feature.stdin, 'not-a-page')
      await vi.waitFor(() => expect(feature.lastFrame()).toContain('Something went wrong'))
      expect(feature.lastFrame()).toContain('USAGE')
      expect(flat(feature.lastFrame())).toContain('The reference not-a-page is not a Confluence page.')
    })

    it('publishes through runPublish in the workspace root, whose refusal of a missing docs repo shows on the error screen', async () => {
      const workspaceRoot = await mkdtemp(join(tmpdir(), 'hedy-menu-confluence-'))
      try {
        const feature = renderWithDefaults(workspaceRoot)
        await openInput(feature, 1, 'Page path')
        await typeThenEnter(feature.stdin, pagePath)
        await vi.waitFor(() => expect(feature.lastFrame()).toContain('Something went wrong'))
        expect(feature.lastFrame()).toContain('USAGE')
        const withoutSpaces = (text) => text.replace(/\s+/g, '')
        expect(withoutSpaces(feature.lastFrame())).toContain(withoutSpaces(`The docs repo is not at ${join(workspaceRoot, 'trade-imports-documentation')}.`))
        expect(feature.detaches).toEqual([])
      } finally {
        await rm(workspaceRoot, { recursive: true, force: true })
      }
    })
  })
})
