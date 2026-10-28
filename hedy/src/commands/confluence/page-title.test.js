import { readFile } from 'node:fs/promises'
import { describe, it, expect } from 'vitest'
import { titleOf } from './page-title.js'

const guideFixture = (name) => new URL(`./__fixtures__/docs-repo/docs/systems/HEDY/${name}`, import.meta.url)

const titleOfFixture = async (name) => titleOf(await readFile(guideFixture(name), 'utf8'), name)

describe('titleOf', () => {
  it.each([
    ['the frontmatter title of the publishing page', 'Guide/publishing.md', 'Publishing guide'],
    ['the first heading of the components page, which has no frontmatter', 'components.md', 'Components'],
    ['the file name with spaces for hyphens for a page with neither', 'Guide/no-title.md', 'no title']
  ])('gives %s', async (_, name, title) => {
    expect(await titleOfFixture(name)).toBe(title)
  })

  it('turns every adr in the file name, in any case, into ADR- when the text is empty', () => {
    expect(titleOf('', 'docs/release-notes-adr.md')).toBe('release notes ADR-')
    expect(titleOf('', 'Adr-guide.md')).toBe('ADR- guide')
  })

  it.each([
    ['double quotes', '"Quoted title"'],
    ['single quotes', '\'Quoted title\''],
    ['no quotes and spaces around the value', '  Quoted title  ']
  ])('strips %s from a frontmatter title', (_, value) => {
    expect(titleOf(`---\ntitle: ${value}\n---\n\n# Heading\n`, 'page.md')).toBe('Quoted title')
  })

  it('falls back to the first heading when the frontmatter title is only quotes', () => {
    expect(titleOf('---\ntitle: ""\n---\n\n# The heading\n', 'page.md')).toBe('The heading')
  })

  it('reads a frontmatter title only from the line straight after the opening fence', () => {
    expect(titleOf('---\ndescription: text\ntitle: Late title\n---\n\n# The heading\n', 'page.md')).toBe('The heading')
  })

  it('takes the first level-one heading and skips a level-two heading before it', () => {
    expect(titleOf('## Second level\n\n#   First level  \n', 'page.md')).toBe('First level')
  })
})
