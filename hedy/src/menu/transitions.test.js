import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { HedyError } from '../errors.js'
import { SCREENS } from './screens.js'
import { createTransitions } from './transitions.js'

const FAULT_CONTEXT = { argv: [], workspaceRoot: '/work', versions: { hedy: '0.1.0' }, platform: 'linux', arch: 'x64' }

const recordTransitions = () => {
  const calls = []
  const transitions = createTransitions({
    setScreen: (screen) => { calls.push(['screen', screen]) },
    setScreenData: (screenData) => { calls.push(['screenData', screenData]) },
    setLoadingMessage: (message) => { calls.push(['loadingMessage', message]) },
    faultContext: () => FAULT_CONTEXT
  })
  return { ...transitions, calls }
}

const errorsShown = (calls) => calls.find(([setter]) => setter === 'screenData')[1].errors.map(({ code, message }) => [code, message])

describe('createTransitions', () => {
  it('showLoading sets the loading message, then shows the loading screen', () => {
    const { showLoading, calls } = recordTransitions()
    showLoading('Reading HEDY-101')
    expect(calls).toEqual([['loadingMessage', 'Reading HEDY-101'], ['screen', SCREENS.LOADING]])
  })

  it('showErrors sets the errors in the screen data, then shows the error screen', () => {
    const error = new HedyError('NOT_FOUND', 'Jira has no such issue. Check the key, then try again.')
    const { showErrors, calls } = recordTransitions()
    showErrors(error)
    expect(calls).toEqual([['screenData', { errors: [error] }], ['screen', SCREENS.ERROR]])
  })

  it.each([
    ['an AggregateError as each error it holds', new AggregateError([new HedyError('AUTH', 'Jira refused.'), new HedyError('NETWORK', 'Confluence did not answer.')]), [['AUTH', 'Jira refused.'], ['NETWORK', 'Confluence did not answer.']]],
    ['a ZodError as USAGE', z.string().safeParse(1).error, [['USAGE', 'Invalid input: expected string, received number']]],
    ['a plain Error as INTERNAL', new TypeError('confirm is not a function'), [['INTERNAL', 'hedy stopped on a fault in hedy: TypeError: confirm is not a function. The fault is not in the command\'s input. File the report as a hedy bug.']]]
  ])('showErrors shows %s', (_case, error, expected) => {
    const { showErrors, calls } = recordTransitions()
    showErrors(error)
    expect(errorsShown(calls)).toEqual(expected)
  })

  it('showErrors gives a fault in hedy the triage report of the fault', () => {
    const { showErrors, calls } = recordTransitions()
    showErrors(new TypeError('confirm is not a function'))
    const [shown] = calls.find(([setter]) => setter === 'screenData')[1].errors
    expect(shown.report).toMatchObject({ fault: 'TypeError: confirm is not a function', missingFeature: 'the function confirm', reproduction: 'hedy' })
  })
})
