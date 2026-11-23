import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { svgTokens } from '../../test-support/svg-tokens.js'
import { layOutSequence } from './sequence-layout.js'
import { readSequenceSource } from './sequence-source.js'
import { svgNumber, svgOfScene } from './sequence-svg.js'

const FIXTURES = new URL('./__fixtures__/sequence/', import.meta.url)
const APPROVED = new URL('approved/', FIXTURES)
const approvedNames = (await readdir(APPROVED)).map((name) => name.replace(/\.svg$/, ''))

const drawn = (text, label = 'flow.mmd') => svgOfScene(layOutSequence(readSequenceSource(text, { label })))
const drawnLines = (...lines) => drawn(['sequenceDiagram', ...lines].join('\n'))

describe('svgOfScene draws the approved INS Auth diagrams', () => {
  it.each(approvedNames)('%s matches its approved drawing byte for byte', async (name) => {
    const source = await readFile(new URL(`${name}.mmd`, FIXTURES), 'utf8')
    await expect(drawn(source, name)).toMatchFileSnapshot(fileURLToPath(new URL(`${name}.svg`, APPROVED)))
  })
})

describe('svgNumber', () => {
  it.each([
    [914.25, '914.3'],
    [914.25 + 1e-10, '914.3'],
    [914.25 - 1e-10, '914.3'],
    [0.1 + 0.2, '0.3'],
    [40, '40'],
    [-0.04, '0']
  ])('writes %d to one decimal place as %s, whichever side of a halfway point the last binary digit falls', (value, text) => {
    expect(svgNumber(value)).toBe(text)
  })

  it('writes whole numbers when asked for no decimal places', () => {
    expect(svgNumber(1633.5 - 1e-10, { places: 0 })).toBe('1634')
  })

  it.each([[Number.NaN], [Infinity], [undefined]])('refuses %s as an internal fault, so the drawing never holds a position that is not a number', (value) => {
    expect(() => svgNumber(value)).toThrow(expect.objectContaining({
      code: 'UNKNOWN',
      message: expect.stringContaining(`A drawing position is ${value}, not a number.`)
    }))
  })
})

describe('svgOfScene', () => {
  const svg = drawnLines(
    'participant A as Alpha & "Beta"',
    'participant B as <Gamma>',
    "A->>B: Delta's <request>"
  )

  it('escapes the characters that would break the markup and keeps every tag closed', () => {
    expect(svg).toContain('Alpha &amp; &quot;Beta&quot;')
    expect(svg).toContain('&lt;Gamma&gt;')
    expect(svg).toContain('Delta&#x27;s &lt;request&gt;')
    expect(() => svgTokens(svg)).not.toThrow()
  })

  it('sizes the image to its view box and paints a white background first', () => {
    const [root, , , , , , background] = svgTokens(svg)
    const [, , viewWidth, viewHeight] = root.attributes.viewBox.split(' ')
    expect([root.attributes.width, root.attributes.height]).toEqual([viewWidth, viewHeight])
    expect(background.attributes).toMatchObject({ x: '0', y: '0', width: viewWidth, height: viewHeight, fill: '#ffffff' })
  })

  it('writes the same text for the same source', () => {
    expect(drawnLines('participant A as Alpha', 'participant B as Beta', 'A->>B: Hello')).toBe(drawnLines('participant A as Alpha', 'participant B as Beta', 'A->>B: Hello'))
  })
})
