import { rm } from 'node:fs/promises'
import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { HedyError } from '../../errors.js'
import { createWorkspace } from '../../test-support/cli.js'
import { FeatureHarness } from '../../test-support/menu-harness.js'
import { SCREENS } from '../screens.js'
import { useWorkspaceFeature } from './use-workspace-feature.js'

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const flat = (frame) => frame.replace(/\s+/g, ' ')

const renderWorkspaceFeature = (options) => {
  const returns = []
  const instance = render(createElement(FeatureHarness, {
    useFeature: useWorkspaceFeature,
    initialScreen: SCREENS.MAIN,
    options,
    navigateToMain: () => { returns.push('main') },
    onMount: (feature) => { feature.handleMainMenuSelect() }
  }))
  return { ...instance, returns }
}

describe('useWorkspaceFeature', () => {
  it('shows the loading message, then one row per check, and Enter on the result returns to the main menu', async () => {
    const checks = []
    const answer = Promise.withResolvers()
    const { lastFrame, stdin, returns } = renderWorkspaceFeature({
      checkWorkspace: () => {
        checks.push('check')
        return answer.promise
      }
    })
    await vi.waitFor(() => expect(lastFrame()).toContain('Checking the workspace setup'))
    answer.resolve({ root: '/ws', checks: [{ name: 'Node', detail: 'Node 24.15.0' }, { name: 'Git hooks', detail: 'core.hooksPath is .githooks' }] })
    await vi.waitFor(() => expect(lastFrame()).toContain('Workspace setup'))
    const frame = lastFrame()
    expect(frame).toContain('Node:      Node 24.15.0')
    expect(frame).toContain('Git hooks: core.hooksPath is .githooks')
    expect(checks).toEqual(['check'])
    await pause()
    stdin.write('\r')
    await vi.waitFor(() => expect(returns).toEqual(['main']))
  })

  it('shows the error screen with each failed check when the check fails', async () => {
    const { lastFrame } = renderWorkspaceFeature({
      checkWorkspace: async () => {
        throw new AggregateError([
          new HedyError('SETUP', 'Git hooks: core.hooksPath is not set. Set it with make install.'),
          new HedyError('SETUP', 'hedy link: hedy is not linked. Link it with make install.')
        ], 'The workspace setup check failed')
      }
    })
    await vi.waitFor(() => expect(lastFrame()).toContain('Something went wrong'))
    const frame = flat(lastFrame())
    expect(frame).toContain('SETUP Git hooks: core.hooksPath is not set. Set it with make install.')
    expect(frame).toContain('SETUP hedy link: hedy is not linked. Link it with make install.')
  })

  describe('with the default check', () => {
    let root

    beforeEach(async () => {
      root = await createWorkspace()
    })

    afterEach(async () => {
      await rm(root, { recursive: true, force: true })
    })

    it('runs the workspace check against the workspace root it is given, so a fixture without a CHILDREN line shows that SETUP error', async () => {
      const { lastFrame } = renderWorkspaceFeature({ env: process.env, workspaceRoot: () => root })
      await vi.waitFor(() => expect(lastFrame()).toContain('Something went wrong'), { timeout: 10000 })
      expect(flat(lastFrame())).toContain('has no CHILDREN line')
    })
  })
})
