const isFrontMatterDelimiter = (line) => /^---\s*$/.test(line)

const blankFrontMatter = (lines) => {
  if (!isFrontMatterDelimiter(lines[0])) return lines
  const closingIndex = lines.findIndex((line, index) => index > 0 && isFrontMatterDelimiter(line))
  const blankedCount = closingIndex === -1 ? lines.length : closingIndex + 1
  return lines.map((line, index) => (index < blankedCount ? '' : line))
}

const blankFencedBlocks = (lines) => {
  let insideFence = false
  return lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      insideFence = !insideFence
      return ''
    }
    return insideFence ? '' : line
  })
}

const blankBlockquotes = (lines) => lines.map((line) => (/^\s*>/.test(line) ? '' : line))

const deleteCodeSpans = (line) => line.replace(/``([^`]|`[^`])*``/g, '').replace(/`[^`]*`/g, '')

const deleteUrls = (line) => line.replace(/https?:\/\/[^\s<>")]+/g, '')

/**
 * Returns the text with front matter, fenced blocks, blockquotes, code spans
 * and URLs blanked. The result has as many lines as the text, and a line that
 * holds none of those regions is unchanged.
 *
 * @param {string} text
 * @returns {string}
 */
export const maskText = (text) => {
  const lines = blankBlockquotes(blankFencedBlocks(blankFrontMatter(text.split('\n'))))
  return lines.map((line) => deleteUrls(deleteCodeSpans(line))).join('\n')
}
