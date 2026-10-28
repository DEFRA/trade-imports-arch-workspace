import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { describe, it, expect, vi } from 'vitest'
import { InputScreen } from './input-screen.js'

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const renderInput = (props = {}) => {
  const submitted = []
  const cancels = []
  const instance = render(createElement(InputScreen, {
    title: 'Read an issue',
    label: 'Issue key',
    onSubmit: (value) => { submitted.push(value) },
    onCancel: () => { cancels.push(true) },
    ...props
  }))
  return { ...instance, submitted, cancels }
}

const typeThenEnter = async (stdin, text) => {
  await pause()
  if (text !== '') {
    stdin.write(text)
    await pause()
  }
  stdin.write('\r')
}

describe('InputScreen', () => {
  it('renders the title, the subtitle, the label, the placeholder and the hint', () => {
    const { lastFrame } = renderInput({ subtitle: 'Jira', placeholder: 'EUDPA-123' })
    const frame = lastFrame()
    for (const text of ['Read an issue', 'Jira', 'Issue key: ', 'EUDPA-123', 'Press Enter to submit, or leave the field blank to go back']) {
      expect(frame).toContain(text)
    }
  })

  it('gives onSubmit the trimmed value after you type and press Enter', async () => {
    const { stdin, submitted, cancels } = renderInput()
    await typeThenEnter(stdin, '  EUDPA-748 ')
    await vi.waitFor(() => expect(submitted).toEqual(['EUDPA-748']))
    expect(cancels).toEqual([])
  })

  it.each([
    ['a blank', ''],
    ['a whitespace-only', '   ']
  ])('calls onCancel and not onSubmit on %s submit', async (_case, text) => {
    const { stdin, submitted, cancels } = renderInput()
    await typeThenEnter(stdin, text)
    await vi.waitFor(() => expect(cancels).toEqual([true]))
    expect(submitted).toEqual([])
  })
})
