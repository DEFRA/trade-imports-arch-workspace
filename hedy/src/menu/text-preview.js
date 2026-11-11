const rowsTakenBy = (line, columns) => Math.max(1, Math.ceil(line.length / columns))

const fittingLineCount = (lines, { maxRows, columns }) => {
  let usedRows = 0
  for (const [index, line] of lines.entries()) {
    usedRows += rowsTakenBy(line, columns)
    if (usedRows > maxRows) return index
  }
  return lines.length
}

/**
 * Returns the whole text and hiddenLines 0 when its lines fit in maxRows
 * rows, else the first lines that fit joined with newlines and the count of
 * lines left out. A line takes one row per columns characters, and at least
 * one row. A trailing newline does not count as a line.
 *
 * @param {string} text
 * @param {{ maxRows: number, columns: number }} budget
 * @returns {{ text: string, hiddenLines: number }}
 */
export const previewOf = (text, budget) => {
  const lines = text.replace(/\n$/, '').split('\n')
  const keptLines = fittingLineCount(lines, budget)
  if (keptLines === lines.length) return { text, hiddenLines: 0 }
  return { text: lines.slice(0, keptLines).join('\n'), hiddenLines: lines.length - keptLines }
}

/**
 * Returns '' for no hidden lines, else the count of hidden lines and, when
 * wholeText is given, the command that prints the whole text.
 *
 * @param {number} hiddenLines
 * @param {{ command: string, whole: string }} [wholeText]
 * @returns {string}
 */
export const moreLinesNote = (hiddenLines, wholeText) => {
  if (hiddenLines === 0) return ''
  const count = hiddenLines === 1 ? 'One more line.' : `${hiddenLines} more lines.`
  return wholeText === undefined ? count : `${count} Run ${wholeText.command} to read the whole ${wholeText.whole}.`
}
