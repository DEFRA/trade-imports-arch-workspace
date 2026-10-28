import { createElement } from 'react'
import { Box, Text, useInput } from 'ink'

/**
 * Returns one line per row and one per further line of a value that holds
 * newlines. The label and its colon fill a column two wider than the longest
 * label, and a further line leaves that column blank.
 *
 * @param {[string, string][]} rows
 * @returns {string[]}
 */
export const rowLines = (rows) => {
  const width = Math.max(...rows.map(([label]) => label.length)) + 2
  return rows.flatMap(([label, value]) =>
    value.split('\n').map((line, index) => `${(index === 0 ? `${label}:` : '').padEnd(width)}${line}`))
}

/**
 * Renders the rows through rowLines, then a blank line and the text when the
 * text is not empty.
 */
export const RowsAndText = ({ rows, text }) =>
  createElement(
    Box,
    { flexDirection: 'column' },
    ...rowLines(rows).map((line, index) => createElement(Text, { key: `row-${index}` }, line)),
    text === '' ? null : createElement(Box, { key: 'text', marginTop: 1 }, createElement(Text, null, text))
  )

/**
 * Renders the grey hint "Press Enter to go back" and calls onReturn when the
 * person presses Enter.
 */
export const ReturnPrompt = ({ onReturn }) => {
  useInput((_input, key) => {
    if (key.return) onReturn()
  })
  return createElement(Box, { marginTop: 1 }, createElement(Text, { color: 'gray' }, 'Press Enter to go back'))
}

export const ResultScreen = ({ title, rows = [], text = '', note = '', onReturn }) =>
  createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    createElement(Box, { marginBottom: 1 }, createElement(Text, { bold: true, color: 'cyan' }, title)),
    createElement(RowsAndText, { rows, text }),
    note === '' ? null : createElement(Box, { marginTop: 1 }, createElement(Text, { color: 'gray' }, note)),
    onReturn ? createElement(ReturnPrompt, { onReturn }) : null
  )
