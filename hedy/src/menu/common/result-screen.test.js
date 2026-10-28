import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { describe, it, expect, vi } from 'vitest'
import { ResultScreen, rowLines } from './result-screen.js'

const rows = [
  ['Issue', 'EUDPA-748'],
  ['Description', 'unchanged'],
  ['Warnings', 'The summary is long.\nThe labels are empty.']
]

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const trimmedLines = (frame) => frame.split('\n').map((line) => line.trimEnd())

describe('rowLines', () => {
  it('aligns every value two columns after the longest label and its colon', () => {
    expect(rowLines([['Issue', 'EUDPA-748'], ['Description', 'unchanged']])).toEqual([
      'Issue:       EUDPA-748',
      'Description: unchanged'
    ])
  })

  it('continues a value that holds newlines on the following lines, under its first line', () => {
    expect(rowLines([['Key', 'one'], ['Warnings', 'first\nsecond']])).toEqual([
      'Key:      one',
      'Warnings: first',
      '          second'
    ])
  })

  it('returns no lines for no rows', () => {
    expect(rowLines([])).toEqual([])
  })
})

describe('ResultScreen', () => {
  it('renders the title and each row with the values aligned on the longest label', () => {
    const { lastFrame } = render(createElement(ResultScreen, { title: 'Replace the description', rows }))
    const lines = trimmedLines(lastFrame())
    expect(lastFrame()).toContain('Replace the description')
    for (const line of rowLines(rows)) expect(lines.some((frameLine) => frameLine.endsWith(line))).toBe(true)
    expect(lines.some((frameLine) => frameLine.endsWith('             The labels are empty.'))).toBe(true)
  })

  it('renders the text after a blank line and the note', () => {
    const { lastFrame } = render(createElement(ResultScreen, {
      title: 'EUDPA-748',
      rows: [['Status', 'To Do']],
      text: 'The first line of the description.',
      note: 'Run hedy jira ticket EUDPA-748 to read the whole description.'
    }))
    const lines = trimmedLines(lastFrame())
    const textIndex = lines.findIndex((line) => line.includes('The first line of the description.'))
    expect(lines[textIndex - 1].trim()).toBe('')
    expect(lines.findIndex((line) => line.includes('Status:'))).toBeLessThan(textIndex)
    expect(lastFrame()).toContain('Run hedy jira ticket EUDPA-748 to read the whole description.')
  })

  it('renders only the title and the rows for empty text and an empty note', () => {
    const { lastFrame } = render(createElement(ResultScreen, { title: 'EUDPA-748', rows: [['Status', 'To Do']], text: '', note: '' }))
    expect(trimmedLines(lastFrame())).toEqual(['', ' EUDPA-748', '', ' Status: To Do', ''])
  })

  it('renders no return hint when onReturn is not given', () => {
    const { lastFrame } = render(createElement(ResultScreen, { title: 'EUDPA-748', rows }))
    expect(lastFrame()).not.toContain('Press Enter to go back')
  })

  it('renders the return hint and calls onReturn when you press Enter', async () => {
    const returns = []
    const { lastFrame, stdin } = render(createElement(ResultScreen, { title: 'EUDPA-748', rows, onReturn: () => { returns.push(true) } }))
    expect(lastFrame()).toContain('Press Enter to go back')
    await pause()
    stdin.write('x')
    await pause()
    expect(returns).toEqual([])
    stdin.write('\r')
    await vi.waitFor(() => expect(returns).toEqual([true]))
  })
})
