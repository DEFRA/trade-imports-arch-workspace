const MASKED_SPAN = '@'

const isFrontMatterDelimiter = (line) => /^---\s*$/.test(line)

const blankFrontMatter = (lines) => {
  if (!isFrontMatterDelimiter(lines[0])) return lines
  const closingIndex = lines.findIndex((line, index) => index > 0 && isFrontMatterDelimiter(line))
  if (closingIndex === -1) return lines
  return lines.map((line, index) => (index <= closingIndex ? '' : line))
}

const openingFence = (line) => line.match(/^\s*(`{3,}|~{3,})/)?.[1]

const closesFence = (line, fence) => {
  const run = line.match(/^\s*(`{3,}|~{3,})\s*$/)?.[1]
  return run !== undefined && run[0] === fence[0] && run.length >= fence.length
}

const blankFencedBlocks = (lines) => {
  let fence
  return lines.map((line) => {
    if (fence === undefined) {
      fence = openingFence(line)
      return fence === undefined ? line : ''
    }
    if (closesFence(line, fence)) fence = undefined
    return ''
  })
}

const blankBlockquotes = (lines) => lines.map((line) => (/^\s*>/.test(line) ? '' : line))

const replaceCodeSpans = (line) => line.replace(/``([^`]|`[^`])*``/g, MASKED_SPAN).replace(/`[^`]*`/g, MASKED_SPAN)

const replaceUrls = (line) => line.replace(/https?:\/\/[^\s<>")]+/g, MASKED_SPAN)

/**
 * Returns the text, split on LF or CRLF and joined on LF, with front matter,
 * fenced blocks and blockquotes blanked, and each code span and URL replaced
 * by one @. The result has as many lines as the text, and a line that holds
 * none of those regions is unchanged.
 *
 * @param {string} text
 * @returns {string}
 */
export const maskText = (text) => {
  const lines = blankBlockquotes(blankFencedBlocks(blankFrontMatter(text.split(/\r?\n/))))
  return lines.map((line) => replaceUrls(replaceCodeSpans(line))).join('\n')
}
