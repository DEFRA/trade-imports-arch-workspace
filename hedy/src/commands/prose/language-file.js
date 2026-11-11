import { join } from 'node:path'
import { HedyError } from '../../errors.js'
import { readTextFile } from '../jira/files.js'

export const LANGUAGE_FILE = '.claude/skills/authoring/references/language.md'

const sectionLines = (lines, heading, { source }) => {
  const start = lines.findIndex((line) => line.trimEnd() === heading)
  if (start === -1) {
    throw new HedyError('PARSE', `The language file at ${source} has no ${heading} heading. Add the heading and its table, then run the command again.`)
  }
  const following = lines.slice(start + 1)
  const end = following.findIndex((line) => line.startsWith('## '))
  return end === -1 ? following : following.slice(0, end)
}

const tableCells = (line, { source }) => {
  const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
  if (cells.length !== 2) {
    throw new HedyError('PARSE', `The row "${line.trim()}" in the language file at ${source} has ${cells.length} cells, not 2. Give the row one cell for the term and one for the repair, with no | inside either, then run the command again.`)
  }
  return cells
}

const tableRowsUnder = (lines, heading, { source }) => {
  const rows = sectionLines(lines, heading, { source })
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) => tableCells(line, { source }))
  if (rows.length === 0) {
    throw new HedyError('PARSE', `The table under ${heading} in the language file at ${source} has no rows. Add at least one row to the table, then run the command again.`)
  }
  return rows
}

const checkedForm = (form, { source }) => {
  if (!/^[A-Za-z0-9][A-Za-z0-9 '-]*\*?$/.test(form)) {
    throw new HedyError('PARSE', `The form \`${form}\` in the language file at ${source} is not a word or phrase. A form holds only letters, digits, spaces, hyphens and straight apostrophes, starts with a letter or digit, and may end on one *. Correct the row in the file, then run the command again.`)
  }
  return form
}

const formsOf = (termCell, { source }) => {
  const forms = [...termCell.matchAll(/`([^`]*)`/g)].map(([, form]) => checkedForm(form, { source }))
  if (forms.length === 0) {
    throw new HedyError('PARSE', `The row whose Term cell is "${termCell}" in the language file at ${source} has no form in backticks. Put each form in backticks in the Term cell, then run the command again.`)
  }
  return forms
}

const wordRow = ([termCell, repair], { source }) => ({
  forms: formsOf(termCell, { source }),
  repair,
  scope: termCell.includes('documents for people only') ? 'documents' : 'all',
  caseSensitive: termCell.includes('in lower case')
})

const patternRow = ([description, repair], index) => ({ key: index + 1, description, repair })

/**
 * Returns the rows of the language file's three tables: banned and examine
 * from the word tables, patterns from the Patterns table. Throws PARSE
 * naming source when a heading is missing, a table has no rows, a word row
 * has no backticked form, or a form holds a character outside the form rule.
 *
 * @param {string} text
 * @param {{ source: string }} options
 * @returns {{
 *   banned: { forms: string[], repair: string, scope: 'all' | 'documents', caseSensitive: boolean }[],
 *   examine: { forms: string[], repair: string, scope: 'all' | 'documents', caseSensitive: boolean }[],
 *   patterns: { key: number, description: string, repair: string }[]
 * }}
 */
export const parseLanguageRows = (text, { source }) => {
  const lines = text.split(/\r?\n/)
  const wordRowsUnder = (heading) => tableRowsUnder(lines, heading, { source }).map((cells) => wordRow(cells, { source }))
  return {
    banned: wordRowsUnder('## Banned Words and Phrases'),
    examine: wordRowsUnder('## Words to Examine'),
    patterns: tableRowsUnder(lines, '## Patterns', { source }).map(patternRow)
  }
}

/**
 * Resolves to parseLanguageRows of the language file under workspaceRoot.
 * A missing file rejects with PARSE naming the path.
 *
 * @param {string} workspaceRoot
 */
export const readLanguageRows = async (workspaceRoot) => {
  const path = join(workspaceRoot, LANGUAGE_FILE)
  const missing = () => {
    throw new HedyError('PARSE', `No language file exists at ${path}. Restore the file from git, then run the command again.`)
  }
  const text = await readTextFile(path, { kind: 'language file', missing })
  return parseLanguageRows(text, { source: path })
}
