import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { rejectionOf } from '../../test-support/http.js'
import { LANGUAGE_FILE, parseLanguageRows, readLanguageRows } from './language-file.js'

const WORKSPACE_ROOT = fileURLToPath(new URL('../../../../', import.meta.url))

const loadFixture = async (name) => {
  const source = fileURLToPath(new URL(`./__fixtures__/tables/${name}`, import.meta.url))
  const text = await readFile(source, 'utf8')
  return { source, parse: () => parseLanguageRows(text, { source }) }
}

const parseError = (code, message) => expect.objectContaining({ name: 'HedyError', code, message })

describe('parseLanguageRows', () => {
  it('returns the word rows of both word tables and the numbered pattern rows, ignoring prose beside a form and every other section', async () => {
    const { parse } = await loadFixture('well-formed.md')
    expect(parse()).toEqual({
      banned: [
        { forms: ['frobnicate', 'frobnicates'], repair: 'name the operation', scope: 'all', caseSensitive: false },
        { forms: ['widget*'], repair: 'name the component', scope: 'all', caseSensitive: false },
        { forms: ['make use of', 'don\'t worry'], repair: 'use, or state the risk', scope: 'all', caseSensitive: false },
        { forms: ['you', 'your', 'yours'], repair: 'name the actor', scope: 'documents', caseSensitive: false },
        { forms: ['portal'], repair: 'website or service', scope: 'all', caseSensitive: true }
      ],
      examine: [
        { forms: ['simply'], repair: 'delete the word', scope: 'all', caseSensitive: false },
        { forms: ['gizmo', 'gizmos'], repair: 'keep a literal use', scope: 'all', caseSensitive: false }
      ],
      patterns: [
        { key: 1, description: 'A heading that opens on what', repair: 'name the topic' },
        { key: 2, description: 'An em dash, a spaced en dash or a spaced hyphen used as a sentence break', repair: 'a full stop, a comma or a colon' },
        { key: 3, description: 'A curly quote', repair: 'a straight quote' },
        { key: 4, description: '`N/A` in text or a table cell', repair: 'state the fact' },
        { key: 5, description: 'A sentence or line that ends on the pronoun `it`', repair: 'name the noun' }
      ]
    })
  })

  it('refuses a form holding a bracket with PARSE naming the form and the source', async () => {
    const { source, parse } = await loadFixture('bad-form.md')
    expect(parse).toThrow(parseError('PARSE', `The form \`foo(bar)\` in the language file at ${source} is not a word or phrase. A form holds only letters, digits, spaces, hyphens and straight apostrophes, starts with a letter or digit, and may end on one *. Correct the row in the file, then run the command again.`))
  })

  it('refuses a word table with no rows with PARSE naming the heading and the source', async () => {
    const { source, parse } = await loadFixture('empty-table.md')
    expect(parse).toThrow(parseError('PARSE', `The table under ## Words to Examine in the language file at ${source} has no rows. Add at least one row to the table, then run the command again.`))
  })

  const SOURCE = 'inline/language.md'
  const section = (heading, header, rows) => [`## ${heading}`, '', `| ${header} | Repair |`, '| --- | --- |', ...rows, ''].join('\n')
  const languageText = ({ banned = ['| `frobnicate` | name the operation |'], patterns = ['| A curly quote | a straight quote |'] } = {}) => [
    section('Banned Words and Phrases', 'Term', banned),
    section('Words to Examine', 'Term', ['| `simply` | delete the word |']),
    ...(patterns ? [section('Patterns', 'Pattern', patterns)] : [])
  ].join('\n')

  it.each([
    {
      title: 'a missing heading with PARSE naming the heading',
      text: languageText({ patterns: null }),
      message: `The language file at ${SOURCE} has no ## Patterns heading. Add the heading and its table, then run the command again.`
    },
    {
      title: 'a word row with no backticked form with PARSE naming the Term cell',
      text: languageText({ banned: ['| frobnicate | name the operation |'] }),
      message: `The row whose Term cell is "frobnicate" in the language file at ${SOURCE} has no form in backticks. Put each form in backticks in the Term cell, then run the command again.`
    },
    {
      title: 'a row with a third cell with PARSE naming the row',
      text: languageText({ banned: ['| `frob` | use `a | b` instead |'] }),
      message: `The row "| \`frob\` | use \`a | b\` instead |" in the language file at ${SOURCE} has 3 cells, not 2. Give the row one cell for the term and one for the repair, with no | inside either, then run the command again.`
    },
    {
      title: 'a form that starts with a hyphen with PARSE naming the form',
      text: languageText({ banned: ['| `-frob` | name the operation |'] }),
      message: `The form \`-frob\` in the language file at ${SOURCE} is not a word or phrase. A form holds only letters, digits, spaces, hyphens and straight apostrophes, starts with a letter or digit, and may end on one *. Correct the row in the file, then run the command again.`
    },
    {
      title: 'a form holding a curly apostrophe with PARSE naming the form',
      text: languageText({ banned: ['| `don’t` | name the risk |'] }),
      message: `The form \`don’t\` in the language file at ${SOURCE} is not a word or phrase. A form holds only letters, digits, spaces, hyphens and straight apostrophes, starts with a letter or digit, and may end on one *. Correct the row in the file, then run the command again.`
    }
  ])('refuses $title and the source', ({ text, message }) => {
    expect(() => parseLanguageRows(text, { source: SOURCE })).toThrow(parseError('PARSE', message))
  })
})

describe('readLanguageRows', () => {
  let folder

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'hedy-language-file-'))
  })

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true })
  })

  it('refuses a workspace with no language file with PARSE naming the path', async () => {
    const path = join(folder, LANGUAGE_FILE)
    const error = await rejectionOf(readLanguageRows(folder))
    expect(error.code).toBe('PARSE')
    expect(error.message).toBe(`No language file exists at ${path}. Restore the file from git, then run the command again.`)
  })

  it('reads every row of the workspace language file, with only the you row scoped to documents and only the portal row case sensitive', async () => {
    const { banned, examine, patterns } = await readLanguageRows(WORKSPACE_ROOT)
    expect([banned.length, examine.length, patterns.length]).toEqual([20, 22, 13])
    const rowHolding = (form) => banned.find(({ forms }) => forms.includes(form))
    expect(rowHolding('you')).toMatchObject({ scope: 'documents', caseSensitive: false })
    expect(rowHolding('portal')).toMatchObject({ scope: 'all', caseSensitive: true })
    const otherRows = [...banned, ...examine].filter((row) => row !== rowHolding('you') && row !== rowHolding('portal'))
    expect(otherRows.filter(({ scope, caseSensitive }) => scope !== 'all' || caseSensitive)).toEqual([])
  })
})
