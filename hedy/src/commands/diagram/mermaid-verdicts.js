const verdictOf = async (parse, { label, text }) => {
  try {
    const { diagramType } = await parse(text)
    return { label, ok: true, type: diagramType }
  } catch (error) {
    return { label, ok: false, message: error.message }
  }
}

/**
 * Resolves to one verdict per diagram, in order: the diagram type parse
 * found, or the message parse rejected with. Each parse finishes before the
 * next starts.
 *
 * @param {(text: string) => Promise<{ diagramType: string }>} parse
 * @param {{ label: string, text: string }[]} diagrams
 * @returns {Promise<({ label: string, ok: true, type: string } | { label: string, ok: false, message: string })[]>}
 */
export const verdictsOf = (parse, diagrams) => diagrams.reduce(
  async (earlier, diagram) => [...await earlier, await verdictOf(parse, diagram)],
  Promise.resolve([])
)
