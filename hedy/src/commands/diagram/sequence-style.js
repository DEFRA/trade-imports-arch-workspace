import { HedyError } from '../../errors.js'

export const COLOURS = Object.freeze({
  ink: '#222222',
  line: '#555555',
  soft: '#666666',
  lifeline: '#c8c8c8',
  noteFill: '#f4f4f4',
  noteEdge: '#cccccc',
  noteText: '#333333',
  zoneFill: '#fafafa',
  zoneEdge: '#bbbbbb',
  zoneText: '#888888',
  white: '#ffffff'
})

export const FONTS = Object.freeze({
  text: 'Helvetica Neue, Helvetica, Arial, sans-serif',
  mono: 'Menlo, Consolas, Courier New, monospace'
})

const plainText = Object.freeze({ fill: COLOURS.ink, anchor: 'middle', bold: false, mono: false, italic: false, spacing: undefined })

const TEXT_STYLES = Object.freeze({
  title: { ...plainText, size: 14, bold: true },
  caption: { ...plainText, size: 11.5, fill: COLOURS.soft, mono: true },
  label: { ...plainText, size: 12.5 },
  labelDetail: { ...plainText, size: 12.5, fill: COLOURS.soft },
  requestLine: { ...plainText, size: 12, mono: true },
  badge: { ...plainText, size: 11, fill: COLOURS.white, bold: true },
  note: { ...plainText, size: 12, fill: COLOURS.noteText },
  zoneLabel: { ...plainText, size: 10.5, fill: COLOURS.zoneText, anchor: 'end', bold: true, italic: true, spacing: 0.09 },
  frameHeading: { ...plainText, size: 10.5, fill: COLOURS.soft, anchor: 'start', bold: true, spacing: 0.07 },
  condition: { ...plainText, size: 12, anchor: 'start' }
})

/**
 * Returns the type settings of a text role: size, fill, anchor, weight,
 * family, slant and letter spacing in ems. Throws UNKNOWN for a role the
 * style does not define.
 *
 * @param {string} role
 */
export const textStyle = (role) => {
  const style = TEXT_STYLES[role]
  if (style === undefined) {
    throw new HedyError('UNKNOWN', `The text role "${role}" has no style. This is a fault in hedy: report the source file that gave it, then draw the diagram with Mermaid meanwhile.`)
  }
  return style
}

const arrow = ({ dashes }) => ({ stroke: COLOURS.line, 'stroke-width': '1.4', 'stroke-dasharray': dashes, 'marker-end': 'url(#arw)' })

export const SHAPE_STYLES = Object.freeze({
  background: { fill: COLOURS.white },
  zoneBand: { rx: '8', fill: COLOURS.zoneFill, stroke: COLOURS.zoneEdge, 'stroke-dasharray': '5 4' },
  lifeline: { stroke: COLOURS.lifeline, 'stroke-width': '1.2', 'stroke-dasharray': '4 4' },
  serviceBox: { rx: '6', fill: COLOURS.white, stroke: COLOURS.line },
  frame: { rx: '6', fill: 'none', stroke: COLOURS.zoneEdge, 'stroke-width': '1.2' },
  divider: { stroke: COLOURS.zoneEdge, 'stroke-dasharray': '5 4' },
  request: arrow({ dashes: undefined }),
  reply: arrow({ dashes: '5 4' }),
  badge: { fill: COLOURS.ink },
  note: { rx: '4', fill: COLOURS.noteFill, stroke: COLOURS.noteEdge },
  arrowhead: { fill: COLOURS.line }
})
