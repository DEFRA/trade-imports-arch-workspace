import { HedyError } from '../../errors.js'
import { FONTS, SHAPE_STYLES } from './sequence-style.js'

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }
const escaped = (text) => text.replace(/[&<>"']/g, (character) => ESCAPES[character])

/**
 * Returns value written to places decimal places, without a trailing zero.
 * The value is first rounded to millionths, so floating-point drift in the
 * last binary digit cannot move a value across a halfway point. A halfway
 * value rounds up. Throws UNKNOWN when value is not a finite number.
 *
 * @param {number} value
 * @param {{ places?: number }} [options]
 * @returns {string}
 */
export const svgNumber = (value, { places = 1 } = {}) => {
  if (!Number.isFinite(value)) {
    throw new HedyError('UNKNOWN', `A drawing position is ${value}, not a number. This is a fault in hedy: report the source file that gave it, then draw the diagram with Mermaid meanwhile.`)
  }
  const scale = 10 ** places
  return String(Math.round(Math.round(value * 1e6) / (1e6 / scale)) / scale + 0)
}

/**
 * Returns the width and height of the drawing in whole units, the size the
 * SVG declares.
 *
 * @param {{ width: number, height: number }} scene
 * @returns {{ width: number, height: number }}
 */
export const diagramSize = ({ width, height }) => ({
  width: Number(svgNumber(width, { places: 0 })),
  height: Number(svgNumber(height, { places: 0 }))
})

const attributesOf = (attributes) => Object.entries(attributes)
  .filter(([, value]) => value !== undefined)
  .map(([name, value]) => `${name}="${value}"`)
  .join(' ')

const element = (tag, attributes) => `<${tag} ${attributesOf(attributes)}/>`

const textElement = ({ x, y, text, size, fill, anchor, bold, mono, italic, spacing }) => `<text ${attributesOf({
  x: svgNumber(x),
  y: svgNumber(y),
  'font-size': svgNumber(size),
  fill,
  'text-anchor': anchor,
  'font-weight': bold ? '700' : undefined,
  'font-family': mono ? FONTS.mono : undefined,
  'font-style': italic ? 'italic' : undefined,
  'letter-spacing': spacing === undefined ? undefined : `${spacing}em`
})}>${escaped(text)}</text>`

const rectElement = ({ x, y, width, height }, style) =>
  element('rect', { x: svgNumber(x), y: svgNumber(y), width: svgNumber(width), height: svgNumber(height), ...style })

const lineElement = ({ x1, y1, x2, y2 }, style) =>
  element('line', { x1: svgNumber(x1), y1: svgNumber(y1), x2: svgNumber(x2), y2: svgNumber(y2), ...style })

const zoneElements = ({ rect, label }) => [rectElement(rect, SHAPE_STYLES.zoneBand), ...(label === undefined ? [] : [textElement(label)])]

const participantElements = ({ rect, lifeline, texts }) => [
  lineElement({ x1: lifeline.x, y1: lifeline.top, x2: lifeline.x, y2: lifeline.bottom }, SHAPE_STYLES.lifeline),
  rectElement(rect, SHAPE_STYLES.serviceBox),
  ...texts.map(textElement)
]

const frameBoxElement = ({ rect }) => rectElement(rect, SHAPE_STYLES.frame)

const frameMarkingElements = ({ heading, dividers }) => [
  ...heading.map(textElement),
  ...dividers.flatMap(({ x1, x2, y, text }) => [lineElement({ x1, y1: y, x2, y2: y }, SHAPE_STYLES.divider), textElement(text)])
]

const stepElements = ({ labels, arrow, badge }) => [
  ...labels.map(textElement),
  lineElement({ x1: arrow.x1, y1: arrow.y, x2: arrow.x2, y2: arrow.y }, arrow.dashed ? SHAPE_STYLES.reply : SHAPE_STYLES.request),
  element('circle', { cx: svgNumber(badge.x), cy: svgNumber(badge.y), r: svgNumber(badge.r), ...SHAPE_STYLES.badge }),
  textElement(badge.text)
]

const noteElements = ({ rect, texts }) => [rectElement(rect, SHAPE_STYLES.note), ...texts.map(textElement)]

const bodyElements = (item) => (item.kind === 'step' ? stepElements(item) : noteElements(item))

const arrowheadDefinition = () =>
  `<defs><marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${SHAPE_STYLES.arrowhead.fill}"/></marker></defs>`

/**
 * Returns the SVG text of a laid-out sequence diagram: the zone bands, then
 * the alternative frames' boxes, then the lifelines and service boxes, then
 * the frames' headings and dividers, then the steps and notes in source
 * order, on a white background whose size is the view box. Coordinates are
 * written to one decimal place.
 *
 * @param {ReturnType<typeof import('./sequence-layout.js').layOutSequence>} scene
 * @returns {string}
 */
export const svgOfScene = (scene) => {
  const { width, height } = diagramSize(scene)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="${FONTS.text}">`,
    arrowheadDefinition(),
    element('rect', { x: '0', y: '0', width, height, ...SHAPE_STYLES.background }),
    ...scene.zones.flatMap(zoneElements),
    ...scene.frames.map(frameBoxElement),
    ...scene.participants.flatMap(participantElements),
    ...scene.frames.flatMap(frameMarkingElements),
    ...scene.body.flatMap(bodyElements),
    '</svg>'
  ].join('\n') + '\n'
}
