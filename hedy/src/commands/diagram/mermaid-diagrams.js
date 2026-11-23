const OPENING_FENCE = /^\s*```\s*mermaid\s*$/
const CLOSING_FENCE = /^\s*```\s*$/

const blockAfter = (lines, fenceIndex) => {
  const rest = lines.slice(fenceIndex + 1)
  const end = rest.findIndex((line) => CLOSING_FENCE.test(line))
  return end === -1 ? rest : rest.slice(0, end)
}

const blockDiagrams = ({ path, lines, fenceIndex }) => {
  const block = blockAfter(lines, fenceIndex)
  const fenceLine = fenceIndex + 1
  return block.length === 0 ? [] : [{ label: `${path}:${fenceLine}`, path, text: block.join('\n'), linesBefore: fenceLine }]
}

const pageDiagrams = ({ path, text }) => text.split(/\r?\n/).flatMap((line, fenceIndex, lines) =>
  OPENING_FENCE.test(line) ? blockDiagrams({ path, lines, fenceIndex }) : [])

/**
 * Returns the line of the file that a Mermaid message names: the diagram's
 * lines before it plus the line Mermaid gives, or undefined when the message
 * names no line.
 *
 * @param {{ linesBefore: number }} diagram
 * @param {string} message
 * @returns {number | undefined}
 */
export const fileLineOf = ({ linesBefore }, message) => {
  const mermaidLine = message.match(/on line (\d+)/)?.[1]
  return mermaidLine === undefined ? undefined : linesBefore + Number(mermaidLine)
}

/**
 * Returns the Mermaid diagrams a file holds. A .mmd file is one diagram,
 * labelled with its path, with no lines before it. A page gives one diagram
 * for each mermaid block, labelled with the line of its opening fence, with
 * the lines up to that fence before it.
 *
 * @param {{ path: string, text: string }} file
 * @returns {{ label: string, path: string, text: string, linesBefore: number }[]}
 */
export const diagramsInText = ({ path, text }) => path.endsWith('.mmd')
  ? [{ label: path, path, text, linesBefore: 0 }]
  : pageDiagrams({ path, text })
