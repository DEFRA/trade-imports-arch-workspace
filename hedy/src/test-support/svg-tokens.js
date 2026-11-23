const TOKEN = /<(\/?)([a-zA-Z]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g
const ATTRIBUTE = /([\w:-]+)="([^"]*)"/g

const attributesOf = (text) => Object.fromEntries([...text.matchAll(ATTRIBUTE)].map(([, name, value]) => [name, value]))

const tokenOf = ([, closing, tag, attributes, selfClosing, text]) => {
  if (text !== undefined) return text.trim() === '' ? undefined : { kind: 'text', text }
  if (closing) return { kind: 'close', tag }
  return { kind: selfClosing ? 'empty' : 'open', tag, attributes: attributesOf(attributes) }
}

const openTagsAfter = (open, { kind, tag }) => {
  if (kind === 'open') return [...open, tag]
  if (kind !== 'close') return open
  if (open.at(-1) !== tag) throw new Error(`</${tag}> closes <${open.at(-1)}>`)
  return open.slice(0, -1)
}

/**
 * Returns the elements and texts of an SVG document in document order. Each
 * element gives its tag, whether it opens, closes or opens and closes, and its
 * attributes. Text between elements that is only whitespace is left out.
 * Throws when a closing tag does not match the open element, or an element
 * is not closed.
 *
 * @param {string} svg
 */
export const svgTokens = (svg) => {
  const tokens = [...svg.matchAll(TOKEN)].map(tokenOf).filter((token) => token !== undefined)
  const unclosed = tokens.reduce(openTagsAfter, [])
  if (unclosed.length > 0) throw new Error(`<${unclosed.at(-1)}> is not closed`)
  return tokens
}

/**
 * Returns the labels of a sequence drawing's zone bands, in drawing order:
 * the texts set in italics, which the house style uses for zone labels and
 * nothing else.
 *
 * @param {string} svg
 */
export const zoneBandLabels = (svg) => svgTokens(svg).flatMap((token, index, tokens) =>
  token.kind === 'open' && token.tag === 'text' && token.attributes['font-style'] === 'italic' ? [tokens[index + 1].text] : [])
