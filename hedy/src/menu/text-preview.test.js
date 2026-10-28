import { describe, it, expect } from 'vitest'
import { previewOf } from './text-preview.js'

describe('previewOf', () => {
  it.each([
    ['a text shorter than the limit', 'one\ntwo', 3, { text: 'one\ntwo', hiddenLines: 0 }],
    ['a text exactly at the limit', 'one\ntwo\nthree', 3, { text: 'one\ntwo\nthree', hiddenLines: 0 }],
    ['a text at the limit with a trailing newline', 'one\ntwo\nthree\n', 3, { text: 'one\ntwo\nthree\n', hiddenLines: 0 }],
    ['an empty string', '', 3, { text: '', hiddenLines: 0 }]
  ])('returns the whole text with no hidden lines for %s', (_case, text, maxLines, expected) => {
    expect(previewOf(text, maxLines)).toEqual(expected)
  })

  it('returns the first lines and the count hidden for a text longer than the limit', () => {
    expect(previewOf('one\ntwo\nthree\nfour\nfive', 2)).toEqual({ text: 'one\ntwo', hiddenLines: 3 })
  })

  it('does not count a trailing newline as a hidden line', () => {
    expect(previewOf('one\ntwo\nthree\nfour\n', 3)).toEqual({ text: 'one\ntwo\nthree', hiddenLines: 1 })
  })

  it('keeps blank lines inside the text as lines', () => {
    expect(previewOf('one\n\nthree', 2)).toEqual({ text: 'one\n', hiddenLines: 1 })
  })
})
