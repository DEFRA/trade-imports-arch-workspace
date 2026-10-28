import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmScreen } from './confirm-screen.js'

const rows = [
  ['Plan id', 'a'.repeat(64)],
  ['Issue', 'EUDPA-748']
]

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const renderConfirm = (props = {}) => {
  const answers = []
  const instance = render(createElement(ConfirmScreen, {
    title: 'Replace the description',
    rows,
    text: 'h1. The new description',
    question: 'Replace the description?',
    onConfirm: () => { answers.push('confirm') },
    onCancel: () => { answers.push('cancel') },
    ...props
  }))
  return { ...instance, answers }
}

describe('ConfirmScreen', () => {
  it('renders the title, the rows, the text, the question with cancel as the default, and the hint', () => {
    const { lastFrame } = renderConfirm()
    const frame = lastFrame()
    for (const text of [
      'Replace the description',
      `Plan id: ${'a'.repeat(64)}`,
      'Issue:   EUDPA-748',
      'h1. The new description',
      'Replace the description? y/N',
      'Press y to confirm, or n or Enter to go back'
    ]) expect(frame).toContain(text)
  })

  it('renders no text block when the text is empty', () => {
    const { lastFrame } = renderConfirm({ text: '' })
    const lines = lastFrame().split('\n').map((line) => line.trim())
    const issueIndex = lines.indexOf('Issue:   EUDPA-748')
    expect(lines[issueIndex + 1]).toBe('')
    expect(lines[issueIndex + 2]).toBe('Replace the description? y/N')
  })

  it.each([
    ['y', 'confirm'],
    ['n', 'cancel'],
    ['\r', 'cancel']
  ])('on the key %j gives only the %s answer', async (key, answer) => {
    const { stdin, answers } = renderConfirm()
    await pause()
    stdin.write(key)
    await vi.waitFor(() => expect(answers).toEqual([answer]))
  })

  it('gives one confirm answer for two y keys that arrive before the screen renders again', async () => {
    const { stdin, answers } = renderConfirm()
    await pause()
    stdin.write('y')
    stdin.write('y')
    await vi.waitFor(() => expect(answers).toEqual(['confirm']))
    await pause()
    expect(answers).toEqual(['confirm'])
  })

  it('ignores n after y, so only the first answer counts', async () => {
    const { stdin, answers } = renderConfirm()
    await pause()
    stdin.write('y')
    await pause()
    stdin.write('n')
    await pause()
    expect(answers).toEqual(['confirm'])
  })

  it('cuts a long text to 20 rows and names the command that prints the whole plan', () => {
    const text = Array.from({ length: 25 }, (_, index) => `Line ${String(index + 1).padStart(2, '0')} of the plan`).join('\n')
    const { lastFrame } = renderConfirm({ text, wholeText: { command: 'hedy jira describe EUDPA-748 --from description.jira.txt', whole: 'plan' } })
    const frame = lastFrame()
    expect(frame).toContain('Line 20 of the plan')
    expect(frame).not.toContain('Line 21 of the plan')
    expect(frame.replace(/\s+/g, ' ')).toContain('5 more lines. Run hedy jira describe EUDPA-748 --from description.jira.txt to read the whole plan.')
  })

  it('ignores keys other than y, n and Enter', async () => {
    const { stdin, answers } = renderConfirm()
    await pause()
    stdin.write('x')
    await pause()
    expect(answers).toEqual([])
  })
})
