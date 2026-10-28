import { createElement } from 'react'
import { render } from 'ink-testing-library'
import { describe, it, expect, vi } from 'vitest'
import { rowLines } from '../../commands/jira/plan.js'
import { ResultScreen } from './result-screen.js'

const rows = [
  ['Issue', 'EUDPA-748'],
  ['Description', 'unchanged'],
  ['Warnings', 'The summary is long.\nThe labels are empty.']
]

const numberedLines = (count, filler = '') =>
  Array.from({ length: count }, (_, index) => `Line ${String(index + 1).padStart(2, '0')} ${filler}`.trimEnd()).join('\n')

const wholeDescription = { command: 'hedy jira ticket EUDPA-748', whole: 'description' }

const pause = () => new Promise((resolve) => setTimeout(resolve, 30))

const trimmedLines = (frame) => frame.split('\n').map((line) => line.trimEnd())

const flat = (frame) => frame.replace(/\s+/g, ' ')

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

  it('cuts a long text to 20 rows and names the hidden lines and the command that prints the whole text', () => {
    const { lastFrame } = render(createElement(ResultScreen, { title: 'EUDPA-748', text: numberedLines(25), wholeText: wholeDescription }))
    const frame = lastFrame()
    expect(frame).toContain('Line 20')
    expect(frame).not.toContain('Line 21')
    expect(flat(frame)).toContain('5 more lines. Run hedy jira ticket EUDPA-748 to read the whole description.')
  })

  it('counts a line wider than the terminal as the rows it wraps to', () => {
    const { lastFrame } = render(createElement(ResultScreen, { title: 'EUDPA-748', text: numberedLines(20, 'x'.repeat(140)), wholeText: wholeDescription }))
    const frame = lastFrame()
    expect(frame).toContain('Line 10')
    expect(frame).not.toContain('Line 11')
    expect(flat(frame)).toContain('10 more lines. Run hedy jira ticket EUDPA-748 to read the whole description.')
  })

  it('reads the width from the terminal, so 20 lines of 90 characters fit its 100 columns', () => {
    const { lastFrame } = render(createElement(ResultScreen, { title: 'EUDPA-748', text: numberedLines(20, 'x'.repeat(82)), wholeText: wholeDescription }))
    expect(lastFrame()).toContain('Line 20')
    expect(lastFrame()).not.toContain('more line')
  })

  it('names only the hidden lines when no command for the whole text is given', () => {
    const { lastFrame } = render(createElement(ResultScreen, { title: 'EUDPA-748', text: numberedLines(21) }))
    expect(flat(lastFrame())).toContain('One more line.')
    expect(lastFrame()).not.toContain('Run ')
  })

  it('renders the note it is given after the note on the hidden lines', () => {
    const { lastFrame } = render(createElement(ResultScreen, {
      title: 'Issues',
      text: numberedLines(25),
      wholeText: wholeDescription,
      note: 'More issues match.'
    }))
    const frame = flat(lastFrame())
    expect(frame.indexOf('5 more lines.')).toBeGreaterThan(-1)
    expect(frame.indexOf('More issues match.')).toBeGreaterThan(frame.indexOf('5 more lines.'))
  })

  it('renders no note for a text that fits', () => {
    const { lastFrame } = render(createElement(ResultScreen, { title: 'EUDPA-748', text: numberedLines(20), wholeText: wholeDescription }))
    expect(lastFrame()).toContain('Line 20')
    expect(lastFrame()).not.toContain('more line')
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
