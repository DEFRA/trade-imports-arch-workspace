import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { describe, it, expect, vi } from 'vitest'
import { renderFaultReport } from '../../fault-report.js'
import { ErrorScreen } from './error-screen.js'

const errors = [
  { code: 'AUTH', message: 'Jira refused the credentials. Check JIRA_USER and JIRA_TOKEN, then try again.' },
  { code: 'NETWORK', message: 'Confluence did not answer. Check your connection, then try again.' }
]

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const lineHolding = (frame, text) => frame.split('\n').find((line) => line.includes(text))

describe('ErrorScreen', () => {
  it('renders the title, then each error code and message on its own line', () => {
    const { lastFrame } = render(createElement(ErrorScreen, { errors }))
    const frame = lastFrame()
    expect(frame).toContain('Something went wrong')
    for (const { code, message } of errors) expect(lineHolding(frame, code)).toContain(message)
    expect(lineHolding(frame, 'AUTH')).not.toBe(lineHolding(frame, 'NETWORK'))
  })

  it('renders the triage report of a fault in hedy beneath its line, each report line on a line of its own', () => {
    const report = { fault: 'TypeError: confirm is not a function', causes: [], missingFeature: 'the function confirm', environment: 'hedy 0.1.0, linux x64', reproduction: 'hedy' }
    const { lastFrame } = render(createElement(ErrorScreen, { errors: [{ code: 'INTERNAL', message: 'A fault in hedy.', report }] }))
    const lines = lastFrame().split('\n').map((line) => line.trim())
    const reportLines = renderFaultReport(report).split('\n')
    const start = lines.indexOf(reportLines[0])
    expect(lines.findIndex((line) => line.includes('A fault in hedy.'))).toBeLessThan(start)
    expect(lines.slice(start, start + reportLines.length)).toEqual(reportLines)
  })

  it('renders no return hint when onReturn is not given', () => {
    const { lastFrame } = render(createElement(ErrorScreen, { errors }))
    expect(lastFrame()).not.toContain('Press Enter to go back')
  })

  it('renders the return hint and calls onReturn when you press Enter', async () => {
    const returns = []
    const { lastFrame, stdin } = render(createElement(ErrorScreen, { errors, onReturn: () => { returns.push(true) } }))
    expect(lastFrame()).toContain('Press Enter to go back')
    await pause()
    stdin.write('\r')
    await vi.waitFor(() => expect(returns).toEqual([true]))
  })

  it('ignores keys other than Enter', async () => {
    const returns = []
    const { stdin } = render(createElement(ErrorScreen, { errors, onReturn: () => { returns.push(true) } }))
    await pause()
    stdin.write('x')
    await pause()
    expect(returns).toEqual([])
  })
})
