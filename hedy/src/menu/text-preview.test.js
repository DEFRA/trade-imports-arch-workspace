import { describe, it, expect } from 'vitest'
import { moreLinesNote, previewOf } from './text-preview.js'

describe('previewOf', () => {
  it.each([
    ['a text with fewer rows than the budget', 'one\ntwo', { text: 'one\ntwo', hiddenLines: 0 }],
    ['a text exactly at the budget', 'one\ntwo\nthree', { text: 'one\ntwo\nthree', hiddenLines: 0 }],
    ['a text at the budget with a trailing newline', 'one\ntwo\nthree\n', { text: 'one\ntwo\nthree\n', hiddenLines: 0 }],
    ['an empty string', '', { text: '', hiddenLines: 0 }]
  ])('returns the whole text with no hidden lines for %s', (_case, text, expected) => {
    expect(previewOf(text, { maxRows: 3, columns: 10 })).toEqual(expected)
  })

  it('keeps the first lines that fit the row budget and counts the lines left out', () => {
    expect(previewOf('one\ntwo\nthree\nfour\nfive', { maxRows: 2, columns: 10 })).toEqual({ text: 'one\ntwo', hiddenLines: 3 })
  })

  it('counts a line longer than the width as the rows it wraps to', () => {
    const wrappingLine = 'x'.repeat(25)
    expect(previewOf(`one\n${wrappingLine}\nthree`, { maxRows: 4, columns: 10 })).toEqual({ text: `one\n${wrappingLine}`, hiddenLines: 1 })
  })

  it('counts a line exactly the width as one row', () => {
    const fullLine = 'x'.repeat(10)
    expect(previewOf(`${fullLine}\n${fullLine}`, { maxRows: 2, columns: 10 })).toEqual({ text: `${fullLine}\n${fullLine}`, hiddenLines: 0 })
  })

  it('does not count a trailing newline as a hidden line', () => {
    expect(previewOf('one\ntwo\nthree\nfour\n', { maxRows: 3, columns: 10 })).toEqual({ text: 'one\ntwo\nthree', hiddenLines: 1 })
  })

  it('keeps blank lines inside the text as lines of one row', () => {
    expect(previewOf('one\n\nthree', { maxRows: 2, columns: 10 })).toEqual({ text: 'one\n', hiddenLines: 1 })
  })
})

describe('moreLinesNote', () => {
  it.each([
    ['no hidden lines', 0, { command: 'hedy jira ticket HEDY-101', whole: 'description' }, ''],
    ['one hidden line', 1, { command: 'hedy jira ticket HEDY-101', whole: 'description' }, 'One more line. Run hedy jira ticket HEDY-101 to read the whole description.'],
    ['several hidden lines', 5, { command: 'hedy confluence page 123456', whole: 'page' }, '5 more lines. Run hedy confluence page 123456 to read the whole page.'],
    ['one hidden line and no command', 1, undefined, 'One more line.'],
    ['several hidden lines and no command', 5, undefined, '5 more lines.']
  ])('gives %s as %j', (_case, hiddenLines, wholeText, expected) => {
    expect(moreLinesNote(hiddenLines, wholeText)).toBe(expected)
  })
})
