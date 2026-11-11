import { tmpdir } from 'node:os'
import { render as inkRender } from 'ink'
import { render as testRender } from 'ink-testing-library'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderPublish } from '../commands/confluence/publish.js'
import { HedyError } from '../errors.js'
import { EXIT } from '../exit-codes.js'
import { captureIo } from '../test-support/io.js'
import { fakeStderr, fakeStdin, fakeStdout } from '../test-support/menu-streams.js'
import { getCurrent, unmount } from './ink-control.js'
import { launchMenu } from './launch.js'

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

const networkError = new HedyError('NETWORK', 'The publisher did not finish within 10 minutes and was stopped. Check the page in Confluence, then run the command again.')

const DOWN = '\u001B[B'

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const renderAsAtATerminal = (element, options) => inkRender(element, { ...options, interactive: true })

const terminal = () => {
  const io = captureIo()
  return { stdout: fakeStdout(), stdin: fakeStdin(), stderr: fakeStderr(), setExitCode: io.setExitCode, codes: io.codes }
}

const shownIn = (textOf, text) => vi.waitFor(() => expect(textOf()).toContain(text))

const press = async (stdin, ...keys) => {
  for (const key of keys) {
    await pause()
    stdin.write(key)
  }
}

const launch = (streams, options = {}) => launchMenu({
  env: {},
  workspaceRoot: () => tmpdir(),
  stdout: streams.stdout,
  stdin: streams.stdin,
  stderr: streams.stderr,
  setExitCode: streams.setExitCode,
  render: renderAsAtATerminal,
  ...options
})

const publishAfterConfirm = (outcome) => async ({ confirm }) => {
  await confirm(publishFacts)
  return outcome()
}

const publishFromTheMenu = async ({ stdout, stdin }) => {
  await shownIn(stdout.text, 'Quit')
  await press(stdin, DOWN, DOWN, '\r')
  await shownIn(stdout.text, 'Publish a docs page')
  await press(stdin, DOWN, '\r')
  await shownIn(stdout.text, 'Page path: ')
  await press(stdin, pagePath, '\r')
  await shownIn(stdout.text, 'Publish the page?')
  await press(stdin, 'y')
}

afterEach(() => {
  unmount()
})

describe('launchMenu with the real Ink render', () => {
  it('mounts the main menu on the stdout it is given', async () => {
    const streams = terminal()
    const exited = launch(streams)
    await shownIn(streams.stdout.text, 'Quit')
    expect(streams.stdout.text()).toContain('Check the credentials')
    unmount()
    expect(await exited).toBe(EXIT.OK)
  })

  it('resolves to EXIT.OK after Quit and leaves no Ink instance', async () => {
    const streams = terminal()
    const exited = launch(streams)
    await shownIn(streams.stdout.text, 'Quit')
    await press(streams.stdin, DOWN, DOWN, DOWN, '\r')
    expect(await exited).toBe(EXIT.OK)
    expect(getCurrent()).toBe(undefined)
  })

  it('resolves to 0 after a detached publish, with the result text after the Ink frames and no Ink instance', async () => {
    const streams = terminal()
    const exited = launch(streams, { overrides: { publishPage: publishAfterConfirm(async () => updatedResult) } })
    await publishFromTheMenu(streams)
    expect(await exited).toBe(0)
    expect(streams.stdout.text().endsWith(`${renderPublish(updatedResult)}\n`)).toBe(true)
    expect(streams.stderr.text()).toBe('')
    expect(streams.codes).toEqual([0])
    expect(getCurrent()).toBe(undefined)
  })

  it('resolves to 1 after a detached publish that fails with NETWORK, with the message on stderr', async () => {
    const streams = terminal()
    const exited = launch(streams, { overrides: { publishPage: publishAfterConfirm(async () => { throw networkError }) } })
    await publishFromTheMenu(streams)
    expect(await exited).toBe(1)
    expect(streams.stderr.text()).toBe(`${networkError.message}\n`)
    expect(streams.codes).toEqual([1])
    expect(getCurrent()).toBe(undefined)
  })
})

describe('launchMenu with an injected render', () => {
  const testingRender = () => {
    const instances = []
    const render = (element) => {
      const exit = Promise.withResolvers()
      const instance = testRender(element)
      instances.push(instance)
      return {
        ...instance,
        unmount: () => {
          instance.unmount()
          exit.resolve()
        },
        waitUntilExit: () => exit.promise
      }
    }
    return { instances, render }
  }

  it('mounts through the injected render and resolves to EXIT.OK after Quit through that instance', async () => {
    const { instances, render } = testingRender()
    const exited = launch(terminal(), { render, overrides: { onQuit: unmount } })
    const [instance] = instances
    await shownIn(instance.lastFrame, 'Quit')
    await press(instance.stdin, DOWN, DOWN, DOWN, '\r')
    expect(await exited).toBe(EXIT.OK)
    expect(getCurrent()).toBe(undefined)
  })
})
