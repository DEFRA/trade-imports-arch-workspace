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

  it('ignores keys other than y, n and Enter', async () => {
    const { stdin, answers } = renderConfirm()
    await pause()
    stdin.write('x')
    await pause()
    expect(answers).toEqual([])
  })
})
