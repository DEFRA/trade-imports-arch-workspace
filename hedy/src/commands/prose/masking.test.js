import { readFile } from 'node:fs/promises'
import { describe, it, expect } from 'vitest'
import { maskText } from './masking.js'

const readPage = (name) => readFile(new URL(`./__fixtures__/pages/${name}`, import.meta.url), 'utf8')

const EM_DASH = String.fromCodePoint(0x2014)
const CURLY_QUOTES = new RegExp(`[${String.fromCodePoint(0x2018, 0x2019, 0x201c, 0x201d)}]`)

const lineNumbersHolding = (text, form) =>
  text.split('\n').flatMap((line, index) => (line.includes(form) ? [index + 1] : []))

describe('maskText', () => {
  it.each([
    ['an empty string', ''],
    ['a text with no final newline', 'One line of prose'],
    ['a text ending in a newline', 'One line of prose\n'],
    ['a text with an unclosed fence', 'Prose\n```\ncode\nmore code'],
    ['a text with front matter', '---\ntitle: Page\n---\n\n# Page\n'],
    ['a text with every masked region', '---\na: b\n---\n> quote\n```\ncode\n~~~\n`span` and https://example.test/x\n']
  ])('keeps the line count of %s', (_, text) => {
    expect(maskText(text).split('\n')).toHaveLength(text.split('\n').length)
  })

  it.each([
    ['a ``` fenced block', 'Before\n```\nWe leverage it.\n```\nAfter'],
    ['a ~~~ fenced block', 'Before\n~~~\nWe leverage it.\n~~~\nAfter'],
    ['a block opened by ``` and closed by ~~~', 'Before\n```\nWe leverage it.\n~~~\nAfter'],
    ['an indented fence', 'Before\n  ```js\nWe leverage it.\n  ```\nAfter'],
    ['a blockquote line', 'Before\n  > We leverage it.\nAfter'],
    ['a single-backtick span', 'Write `leverage` as data.'],
    ['a double-backtick span that holds a backtick', 'Write ``a `leverage` b`` as data.'],
    ['a double-backtick span with the form before its one inner backtick', 'Write ``a leverage ` b`` as data.'],
    ['a URL', 'See https://example.test/leverage for the page.'],
    ['front matter', '---\ntitle: We leverage it\n---\n\nBody']
  ])('removes the banned form from %s', (_, text) => {
    expect(maskText(text)).not.toContain('leverage')
  })

  it.each([
    ['the lines before and after a fence', 'Before\n```\ncode\n```\nAfter', 'Before\n\n\n\nAfter'],
    ['prose beside a span', 'Use leverage here, not `code`.', 'Use leverage here, not .'],
    ['prose beside a URL', 'Use leverage at https://example.test/page.', 'Use leverage at '],
    ['a --- rule that is not on line 1', '# Page\n\n---\nUse leverage here.', '# Page\n\n---\nUse leverage here.'],
    ['the body after closed front matter', '---\ntitle: Page\n---\nUse leverage here.', '\n\n\nUse leverage here.'],
    ['a line with no masked region', 'Use leverage here.', 'Use leverage here.']
  ])('leaves %s unchanged', (_, text, masked) => {
    expect(maskText(text)).toBe(masked)
  })

  it.each([
    ['an unclosed fence', 'Before\n```\nWe leverage it.\nStill code', 'Before\n\n\n'],
    ['unclosed front matter', '---\ntitle: We leverage it\nBody', '\n\n']
  ])('masks %s to the end of the text', (_, text, masked) => {
    expect(maskText(text)).toBe(masked)
  })

  it.each(['fenced-exemplar.md', 'blockquote-quote.md'])('leaves no em dash and no curly quote in %s', async (name) => {
    const masked = maskText(await readPage(name))
    expect(masked).not.toContain(EM_DASH)
    expect(masked).not.toMatch(CURLY_QUOTES)
  })

  it('keeps exactly one em dash in double-backtick.md, the one outside any span on line 5', async () => {
    const masked = maskText(await readPage('double-backtick.md'))
    expect(masked.split(EM_DASH)).toHaveLength(2)
    expect(lineNumbersHolding(masked, EM_DASH)).toEqual([5])
  })

  it('blanks the front matter of hyphen-break.md and keeps its later --- rule and the lines after the rule', async () => {
    const page = await readPage('hyphen-break.md')
    const maskedLines = maskText(page).split('\n')
    const ruleIndex = page.split('\n').lastIndexOf('---')
    expect(maskedLines.slice(0, 3)).toEqual(['', '', ''])
    expect(maskedLines[ruleIndex]).toBe('---')
    expect(maskedLines[ruleIndex + 2]).toBe('A closing line stays clean.')
  })

  it('deletes the URL in portal-proper-noun.md and keeps the proper noun and the generic noun', async () => {
    const masked = maskText(await readPage('portal-proper-noun.md'))
    expect(masked).not.toContain('portal.example.test')
    expect(lineNumbersHolding(masked, 'CDP Portal')).toEqual([3])
    expect(lineNumbersHolding(masked, 'the portal')).toEqual([5])
  })
})
