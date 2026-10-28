import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { HedyError } from '../../errors.js'
import { FeatureHarness } from '../../test-support/menu-harness.js'
import { SCREENS } from '../screens.js'
import { useAuthFeature } from './use-auth-feature.js'

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const flat = (frame) => frame.replace(/\s+/g, ' ')

const renderAuthFeature = (options) => {
  const returns = []
  const instance = render(createElement(FeatureHarness, {
    useFeature: useAuthFeature,
    initialScreen: SCREENS.MAIN,
    options,
    navigateToMain: () => { returns.push('main') },
    onMount: (feature) => { feature.handleMainMenuSelect() }
  }))
  return { ...instance, returns }
}

describe('useAuthFeature', () => {
  it('shows the loading message, then both display names, and Enter on the result returns to the main menu', async () => {
    const checks = []
    const answer = Promise.withResolvers()
    const { lastFrame, stdin, returns } = renderAuthFeature({
      checkCredentials: () => {
        checks.push('check')
        return answer.promise
      }
    })
    await vi.waitFor(() => expect(lastFrame()).toContain('Checking the Jira and Confluence credentials'))
    answer.resolve({ jira: { displayName: 'Ada Lovelace' }, confluence: { displayName: null } })
    await vi.waitFor(() => expect(lastFrame()).toContain('Credentials'))
    const frame = lastFrame()
    expect(frame).toContain('Jira:       ok as Ada Lovelace')
    expect(frame).toContain('Confluence: ok as an account with no display name')
    expect(checks).toEqual(['check'])
    await pause()
    stdin.write('\r')
    await vi.waitFor(() => expect(returns).toEqual(['main']))
  })

  it('shows the error screen with each code and message when both services fail', async () => {
    const { lastFrame } = renderAuthFeature({
      checkCredentials: async () => {
        throw new AggregateError([
          new HedyError('AUTH', 'whoami: Jira refused the credentials.'),
          new HedyError('NETWORK', 'whoami: Confluence did not answer.')
        ], 'Authentication failed')
      }
    })
    await vi.waitFor(() => expect(lastFrame()).toContain('Something went wrong'))
    const frame = flat(lastFrame())
    expect(frame).toContain('AUTH whoami: Jira refused the credentials.')
    expect(frame).toContain('NETWORK whoami: Confluence did not answer.')
  })

  describe('with the default check', () => {
    let root

    beforeEach(async () => {
      root = await mkdtemp(join(tmpdir(), 'hedy-menu-auth-'))
    })

    afterEach(async () => {
      await rm(root, { recursive: true, force: true })
    })

    it('runs the auth command with the env and workspace root it is given, so missing credentials show the AUTH error', async () => {
      const { lastFrame } = renderAuthFeature({ env: {}, workspaceRoot: () => root })
      await vi.waitFor(() => expect(lastFrame()).toContain('Something went wrong'))
      const frame = flat(lastFrame())
      expect(frame).toContain('AUTH')
      expect(frame).toContain('JIRA_USER, JIRA_TOKEN and JIRA_BASE_URL are not set')
    })
  })
})
