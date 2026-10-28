/**
 * Returns the whole text and hiddenLines 0 when the text has at most
 * maxLines lines, else the first maxLines lines joined with newlines and the
 * count of lines left out. A trailing newline does not count as a line.
 *
 * @param {string} text
 * @param {number} maxLines
 * @returns {{ text: string, hiddenLines: number }}
 */
export const previewOf = (text, maxLines) => {
  const lines = text.replace(/\n$/, '').split('\n')
  if (lines.length <= maxLines) return { text, hiddenLines: 0 }
  return { text: lines.slice(0, maxLines).join('\n'), hiddenLines: lines.length - maxLines }
}
