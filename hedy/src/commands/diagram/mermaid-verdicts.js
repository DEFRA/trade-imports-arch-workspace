const isJavaScriptFault = (error) =>
  [ReferenceError, TypeError, RangeError, SyntaxError, EvalError, URIError].some((type) => error instanceof type)

const failedVerdict = (label, error) => isJavaScriptFault(error)
  ? { label, ok: false, cause: 'hedy', fault: { name: error.name, message: error.message, stack: error.stack } }
  : { label, ok: false, cause: 'diagram', message: error.message }

const verdictOf = async (parse, { label, text }) => {
  try {
    const { diagramType, groups } = await parse(text)
    return groups === undefined ? { label, ok: true, type: diagramType } : { label, ok: true, type: diagramType, groups }
  } catch (error) {
    return failedVerdict(label, error)
  }
}

/**
 * Resolves to one verdict per diagram, in order: the diagram type parse
 * found, or the failure parse rejected with. A JavaScript fault, such as a
 * ReferenceError, has the cause hedy and carries the fault, because hedy could
 * not check the diagram. Any other failure has the cause diagram and carries
 * the message, because Mermaid rejects the diagram. Each parse finishes
 * before the next starts.
 *
 * @param {(text: string) => Promise<{ diagramType: string, groups?: string[] }>} parse
 * @param {{ label: string, text: string }[]} diagrams
 * @returns {Promise<(
 *   { label: string, ok: true, type: string, groups?: string[] }
 *   | { label: string, ok: false, cause: 'diagram', message: string }
 *   | { label: string, ok: false, cause: 'hedy', fault: { name: string, message: string, stack: string } }
 * )[]>}
 */
export const verdictsOf = (parse, diagrams) => diagrams.reduce(
  async (earlier, diagram) => [...await earlier, await verdictOf(parse, diagram)],
  Promise.resolve([])
)
