import { createElement } from 'react'
import { Box, Text, useInput, useStdout } from 'ink'
import { rowLines } from '../../commands/jira/plan.js'
import { moreLinesNote, previewOf } from '../text-preview.js'

/**
 * Renders the rows through rowLines, then a blank line and the text when the
 * text is not empty. The text is cut to the first lines that fit in 20 rows
 * of the terminal's width, and a grey note after it counts the hidden lines
 * and names wholeText's command when wholeText is given.
 *
 * @param {{ rows: [string, string][], text: string, wholeText?: { command: string, whole: string } }} props
 */
export const RowsAndText = ({ rows, text, wholeText }) => {
  const { stdout } = useStdout()
  const preview = previewOf(text, { maxRows: 20, columns: stdout.columns ?? 80 })
  const note = moreLinesNote(preview.hiddenLines, wholeText)
  return createElement(
    Box,
    { flexDirection: 'column' },
    ...rowLines(rows).map((line, index) => createElement(Text, { key: `row-${index}` }, line)),
    text === '' ? null : createElement(Box, { key: 'text', marginTop: 1 }, createElement(Text, null, preview.text)),
    note === '' ? null : createElement(Box, { key: 'note', marginTop: 1 }, createElement(Text, { color: 'gray' }, note))
  )
}

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

export const ResultScreen = ({ title, rows = [], text = '', wholeText, note = '', onReturn }) =>
  createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    createElement(Box, { marginBottom: 1 }, createElement(Text, { bold: true, color: 'cyan' }, title)),
    createElement(RowsAndText, { rows, text, wholeText }),
    note === '' ? null : createElement(Box, { marginTop: 1 }, createElement(Text, { color: 'gray' }, note)),
    onReturn ? createElement(ReturnPrompt, { onReturn }) : null
  )
