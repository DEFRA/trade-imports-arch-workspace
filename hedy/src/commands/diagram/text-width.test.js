import { describe, it, expect } from 'vitest'
import { textWidth } from './text-width.js'

describe('textWidth', () => {
  it.each([
    ['A', 1000, 667],
    ['i', 1000, 222],
    ['7', 1000, 556],
    ['…', 1000, 600],
    ['Ai', 10, 8.89]
  ])('gives %s at size %d the Helvetica width %d', (text, size, width) => {
    expect(textWidth(text, size)).toBeCloseTo(width, 6)
  })

  it('widens bold text by 7 per cent', () => {
    expect(textWidth('Session', 14, { bold: true })).toBeCloseTo(textWidth('Session', 14) * 1.07, 9)
  })

  it('gives monospace text 0.6 of the size per character, counting a character outside the basic plane once', () => {
    expect(textWidth('GET /a', 10, { mono: true })).toBeCloseTo(36, 9)
    expect(textWidth('a😀', 10, { mono: true })).toBeCloseTo(12, 9)
  })

  it('gives the empty text no width', () => {
    expect(textWidth('', 12)).toBe(0)
  })
})
