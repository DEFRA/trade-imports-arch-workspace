import { describe, it, expect } from 'vitest'
import { SHAPE_STYLES, textStyle } from './sequence-style.js'

describe('textStyle', () => {
  it.each([
    ['title', { size: 14, bold: true, mono: false, anchor: 'middle' }],
    ['caption', { size: 11.5, bold: false, mono: true }],
    ['requestLine', { size: 12, mono: true }],
    ['zoneLabel', { size: 10.5, bold: true, italic: true, spacing: 0.09, anchor: 'end' }],
    ['condition', { size: 12, anchor: 'start' }]
  ])('gives the %s role its type settings', (role, settings) => {
    expect(textStyle(role)).toMatchObject(settings)
  })

  it('refuses a role it does not define, naming the role', () => {
    expect(() => textStyle('heading')).toThrow('The text role "heading" has no style.')
  })
})

describe('SHAPE_STYLES', () => {
  it('draws replies dashed and requests solid, both ending in the arrowhead', () => {
    expect(SHAPE_STYLES.reply).toMatchObject({ 'stroke-dasharray': '5 4', 'marker-end': 'url(#arw)' })
    expect(SHAPE_STYLES.request['stroke-dasharray']).toBeUndefined()
    expect(SHAPE_STYLES.request['marker-end']).toBe('url(#arw)')
  })
})
