import { describe, it, expect } from 'vitest'
import { svgTokens, zoneBandLabels } from './svg-tokens.js'

describe('zoneBandLabels', () => {
  it('reads the italic texts, which the house style uses for zone labels, in drawing order', () => {
    const svg = '<svg><text font-style="italic">PUBLIC ZONE</text><text>Browser</text><text font-style="italic">AWS PLATFORM</text></svg>'
    expect(zoneBandLabels(svg)).toEqual(['PUBLIC ZONE', 'AWS PLATFORM'])
  })
})

describe('svgTokens', () => {
  it('lists elements with their attributes and the texts between them, leaving out whitespace', () => {
    expect(svgTokens('<svg width="10">\n  <text x="5">Hello</text><rect y="2"/></svg>')).toEqual([
      { kind: 'open', tag: 'svg', attributes: { width: '10' } },
      { kind: 'open', tag: 'text', attributes: { x: '5' } },
      { kind: 'text', text: 'Hello' },
      { kind: 'close', tag: 'text' },
      { kind: 'empty', tag: 'rect', attributes: { y: '2' } },
      { kind: 'close', tag: 'svg' }
    ])
  })

  it('refuses a document whose tags do not close in order', () => {
    expect(() => svgTokens('<svg><g></svg>')).toThrow('</svg> closes <g>')
    expect(() => svgTokens('<svg>')).toThrow('<svg> is not closed')
  })
})
