import { HedyError } from '../../errors.js'
import { textStyle } from './sequence-style.js'
import { textWidth } from './text-width.js'

const SPACING = Object.freeze({
  lineHeight: 16,
  diagramMargin: 40,
  diagramBottomMargin: 30,
  boxMinimumWidth: 130,
  boxPadding: 28,
  boxGap: 28,
  labelMargin: 56,
  noteHalfPadding: 14,
  noteClearance: 12,
  notePadding: 20,
  noteSpanOverhang: 30,
  noteTextBaseline: 17,
  noteHeightPadding: 10,
  afterNote: 14,
  zonedTop: 52,
  unzonedTop: 22,
  headerHeight: 40,
  headerHeightWithCaption: 58,
  titleBaseline: 25,
  titleBaselineWithCaption: 24,
  captionBaseline: 43,
  firstEventGap: 26,
  labelBaseline: 12,
  arrowBelowLabel: 8,
  afterStep: 22,
  badgeRadius: 10,
  badgeTextDrop: 4,
  arrowStartFromBadge: 12,
  arrowEndShortOfLifeline: 2,
  frameHeadingHeight: 34,
  frameDividerHeight: 30,
  afterFrame: 14,
  frameInset: 10,
  frameTextInset: 12,
  frameConditionGap: 8,
  frameTextBaseline: 20,
  zoneOutset: 12,
  zoneAboveTop: 30,
  zoneBelowBottom: 10,
  zoneLabelInset: 10,
  zoneLabelAboveTop: 12,
  bodyBottomMargin: 10
})

const REQUEST_LINE = /^(GET|POST|PUT|PATCH|DELETE) /

const sum = (values) => values.reduce((total, value) => total + value, 0)

const measuredWidth = (text, role) => {
  const { size, bold, mono, spacing } = textStyle(role)
  return textWidth(text, size, { bold, mono }) + (spacing ?? 0) * size * [...text].length
}

const textAt = ({ x, y, text, role }) => {
  const style = textStyle(role)
  const width = measuredWidth(text, role)
  const left = { start: x, middle: x - width / 2, end: x - width }[style.anchor]
  return { ...style, role, x, y, text, bounds: { left, right: left + width, top: y - style.size * 0.8, bottom: y + style.size * 0.2 } }
}

const isRequestLine = (line) => REQUEST_LINE.test(line)

const labelLineWidth = (line) => measuredWidth(line, isRequestLine(line) ? 'requestLine' : 'label')

const widestNoteLine = ({ lines }) => Math.max(...lines.map((line) => measuredWidth(line, 'note')))

const isSingleNote = ({ over }) => new Set(over).size === 1

const flatEvents = (events) => events.flatMap((event) =>
  event.kind === 'alternative' ? event.branches.flatMap((branch) => flatEvents(branch.events)) : [event])

const columnOf = (index, id) => {
  if (!index.has(id)) {
    throw new HedyError('UNKNOWN', `The diagram names the participant ${id}, which it does not declare. This is a fault in hedy: report the source file that gave it, then draw the diagram with Mermaid meanwhile.`)
  }
  return index.get(id)
}

const withColumns = (event, index) => {
  if (event.kind === 'message') return { ...event, columns: [columnOf(index, event.from), columnOf(index, event.to)] }
  if (event.kind === 'note') return { ...event, columns: event.over.map((id) => columnOf(index, id)) }
  return { ...event, branches: event.branches.map((branch) => ({ ...branch, events: branch.events.map((inner) => withColumns(inner, index)) })) }
}

const resolvedModel = (model) => {
  const index = new Map(model.participants.map(({ id }, i) => [id, i]))
  return {
    ...model,
    zones: model.zones.map((zone) => ({ ...zone, columns: zone.members.map((id) => columnOf(index, id)) })),
    events: model.events.map((event) => withColumns(event, index))
  }
}

const headerWidths = (participants) => participants.map(({ title, caption }) => {
  const width = Math.max(measuredWidth(title, 'title'), caption ? measuredWidth(caption, 'caption') : 0)
  return Math.max(SPACING.boxMinimumWidth, width + SPACING.boxPadding)
})

const gapsBetweenBoxes = (widths) =>
  widths.map((width, i) => (i === 0 ? 0 : widths[i - 1] / 2 + width / 2 + SPACING.boxGap))

const gapsWidenedForNotes = (gaps, { notes, widths }) => notes.filter(isSingleNote).reduce((current, note) => {
  const [i] = note.columns
  const half = widestNoteLine(note) / 2 + SPACING.noteHalfPadding
  const room = (neighbour) => half + widths[neighbour] / 2 + SPACING.noteClearance
  const withLeft = i > 0 ? current.with(i, Math.max(current[i], room(i - 1))) : current
  return i < widths.length - 1 ? withLeft.with(i + 1, Math.max(withLeft[i + 1], room(i + 1))) : withLeft
}, gaps)

const bySpanThenColumns = (a, b) => a.span - b.span || a.left - b.left || a.right - b.right || a.need - b.need

const gapsWidenedForLabels = (gaps, { messages }) => messages
  .map(({ columns, lines }) => {
    const [left, right] = columns.toSorted((a, b) => a - b)
    return { span: right - left, left, right, need: Math.max(...lines.map(labelLineWidth)) + SPACING.labelMargin }
  })
  .toSorted(bySpanThenColumns)
  .reduce((current, { left, right, need }) => {
    const have = sum(current.slice(left + 1, right + 1))
    return have < need ? current.with(right, current[right] + (need - have)) : current
  }, gaps)

const centresAfterGaps = (gaps, start) =>
  gaps.reduce((centres, gap, i) => [...centres, i === 0 ? start : centres[i - 1] + gap], [])

const columnLayout = ({ participants, events }) => {
  const widths = headerWidths(participants)
  const flat = flatEvents(events)
  const gaps = gapsWidenedForLabels(
    gapsWidenedForNotes(gapsBetweenBoxes(widths), { notes: flat.filter(({ kind }) => kind === 'note'), widths }),
    { messages: flat.filter(({ kind }) => kind === 'message') }
  )
  return { widths, centres: centresAfterGaps(gaps, SPACING.diagramMargin + widths[0] / 2) }
}

const labelRole = ({ line, first }) => {
  if (isRequestLine(line)) return 'requestLine'
  return first ? 'label' : 'labelDetail'
}

const labelText = ({ x, y, line, first }) => textAt({ x, y, text: line, role: labelRole({ line, first }) })

const stepLabels = ({ lines, x, top }) => lines.map((line, k) =>
  labelText({ x, y: top + SPACING.labelBaseline + k * SPACING.lineHeight, line, first: k === 0 }))

const stepArrow = ({ x1, x2, y, style }) => {
  const direction = x2 > x1 ? 1 : -1
  return {
    x1: x1 + direction * SPACING.arrowStartFromBadge,
    x2: x2 - direction * SPACING.arrowEndShortOfLifeline,
    y,
    dashed: style === 'dashed'
  }
}

const stepBadge = ({ x, y, number }) => ({
  x,
  y,
  r: SPACING.badgeRadius,
  text: textAt({ x, y: y + SPACING.badgeTextDrop, text: String(number), role: 'badge' })
})

const placeStep = (message, cursor, columns) => {
  const [x1, x2] = message.columns.map((column) => columns.centres[column])
  const number = cursor.steps + 1
  const arrowY = cursor.y + message.lines.length * SPACING.lineHeight + SPACING.arrowBelowLabel
  const step = {
    kind: 'step',
    number,
    from: message.from,
    to: message.to,
    labels: stepLabels({ lines: message.lines, x: (x1 + x2) / 2, top: cursor.y }),
    arrow: stepArrow({ x1, x2, y: arrowY, style: message.style }),
    badge: stepBadge({ x: x1, y: arrowY, number })
  }
  return { body: [step], frames: [], cursor: { y: arrowY + SPACING.afterStep, steps: number } }
}

const noteSpan = (note, columns) => {
  const width = widestNoteLine(note) + SPACING.notePadding
  const [first, last] = note.columns.map((column) => columns.centres[column]).sort((a, b) => a - b)
  if (isSingleNote(note)) return { x: first - width / 2, width }
  return { x: first - SPACING.noteSpanOverhang, width: Math.max(last - first + 2 * SPACING.noteSpanOverhang, width) }
}

const placeNote = (note, cursor, columns) => {
  const { x, width } = noteSpan(note, columns)
  const height = note.lines.length * SPACING.lineHeight + SPACING.noteHeightPadding
  const placed = {
    kind: 'note',
    over: note.over,
    rect: { x, y: cursor.y, width, height },
    texts: note.lines.map((line, k) => textAt({
      x: x + width / 2,
      y: cursor.y + SPACING.noteTextBaseline + k * SPACING.lineHeight,
      text: line,
      role: 'note'
    }))
  }
  return { body: [placed], frames: [], cursor: { ...cursor, y: cursor.y + height + SPACING.afterNote } }
}

const frameEdges = (alternative, columns) => {
  const used = flatEvents([alternative]).flatMap((event) => event.columns)
  const [low, high] = used.length > 0 ? [Math.min(...used), Math.max(...used)] : [0, 0]
  return {
    left: columns.centres[low] - columns.widths[low] / 2 + SPACING.frameInset,
    right: columns.centres[high] + columns.widths[high] / 2 - SPACING.frameInset
  }
}

const conditionText = ({ x, y, condition }) =>
  textAt({ x, y: y + SPACING.frameTextBaseline, text: condition, role: 'condition' })

const frameHeading = ({ left, top, condition }) => {
  const heading = textAt({ x: left + SPACING.frameTextInset, y: top + SPACING.frameTextBaseline, text: 'alt.', role: 'frameHeading' })
  return [heading, conditionText({ x: heading.bounds.right + SPACING.frameConditionGap, y: top, condition })]
}

const frameDividers = ({ left, right, dividers }) => dividers.map(({ y, condition }) =>
  ({ x1: left, x2: right, y, text: conditionText({ x: left + SPACING.frameTextInset, y, condition }) }))

const frameOutline = ({ alternative, top, bottom, dividers, body, columns }) => {
  const { left, right } = frameEdges(alternative, columns)
  const condition = alternative.branches[0].condition
  const heading = frameHeading({ left, top, condition })
  const dividerLines = frameDividers({ left, right, dividers })
  return {
    rect: { x: left, y: top, width: right - left, height: bottom - top },
    heading,
    dividers: dividerLines,
    stepNumbers: body.filter(({ kind }) => kind === 'step').map(({ number }) => number)
  }
}

const joined = (earlier, later) => ({ body: [...earlier.body, ...later.body], frames: [...earlier.frames, ...later.frames], cursor: later.cursor })

const placeAlternative = (alternative, cursor, columns) => {
  const [first, ...others] = alternative.branches
  const placedFirst = placeEvents(first.events, { ...cursor, y: cursor.y + SPACING.frameHeadingHeight }, columns)
  const placed = others.reduce((sofar, branch) => {
    const divider = { y: sofar.cursor.y, condition: branch.condition }
    const branchPlaced = placeEvents(branch.events, { ...sofar.cursor, y: divider.y + SPACING.frameDividerHeight }, columns)
    return { ...joined(sofar, branchPlaced), dividers: [...sofar.dividers, divider] }
  }, { ...placedFirst, dividers: [] })
  const frame = frameOutline({ alternative, top: cursor.y, bottom: placed.cursor.y, dividers: placed.dividers, body: placed.body, columns })
  return { body: placed.body, frames: [...placed.frames, frame], cursor: { ...placed.cursor, y: placed.cursor.y + SPACING.afterFrame } }
}

const PLACERS = { message: placeStep, note: placeNote, alternative: placeAlternative }

const placeEvents = (events, cursor, columns) => events.reduce(
  (sofar, event) => joined(sofar, PLACERS[event.kind](event, sofar.cursor, columns)),
  { body: [], frames: [], cursor }
)

const participantBox = ({ participant, x, width, top, headerHeight, bottom }) => {
  const title = { x, text: participant.title, role: 'title' }
  const texts = participant.caption
    ? [
        textAt({ ...title, y: top + SPACING.titleBaselineWithCaption }),
        textAt({ x, y: top + SPACING.captionBaseline, text: participant.caption, role: 'caption' })
      ]
    : [textAt({ ...title, y: top + SPACING.titleBaseline })]
  return {
    id: participant.id,
    rect: { x: x - width / 2, y: top, width, height: headerHeight },
    lifeline: { x, top: top + headerHeight, bottom },
    texts
  }
}

const zoneEdges = (zone, columns) => {
  const [first, last] = [Math.min(...zone.columns), Math.max(...zone.columns)]
  return {
    left: columns.centres[first] - columns.widths[first] / 2 - SPACING.zoneOutset,
    right: columns.centres[last] + columns.widths[last] / 2 + SPACING.zoneOutset
  }
}

const zoneLabel = ({ name, right, top }) => textAt({
  x: right - SPACING.zoneLabelInset,
  y: top - SPACING.zoneLabelAboveTop,
  text: name.toUpperCase(),
  role: 'zoneLabel'
})

const zoneBand = ({ zone, columns, top, bottom }) => {
  const { left, right } = zoneEdges(zone, columns)
  const band = {
    name: zone.name,
    members: zone.members,
    rect: { x: left, y: top - SPACING.zoneAboveTop, width: right - left, height: bottom - top + (SPACING.zoneAboveTop + SPACING.zoneBelowBottom) }
  }
  return zone.name === '' ? band : { ...band, label: zoneLabel({ name: zone.name, right, top }) }
}

/**
 * Returns the scene of a sequence diagram model: the size of the diagram,
 * the zone bands, the service boxes with their lifelines, the alternative
 * frames in the order they close, and the steps and notes in source order.
 * Every text carries the bounds its estimated width gives.
 *
 * @param {ReturnType<typeof import('./sequence-source.js').readSequenceSource>} model
 */
export const layOutSequence = (sourceModel) => {
  const model = resolvedModel(sourceModel)
  const columns = columnLayout(model)
  const top = model.zones.length > 0 ? SPACING.zonedTop : SPACING.unzonedTop
  const headerHeight = model.participants.some(({ caption }) => caption) ? SPACING.headerHeightWithCaption : SPACING.headerHeight
  const placed = placeEvents(model.events, { y: top + headerHeight + SPACING.firstEventGap, steps: 0 }, columns)
  const bottom = placed.cursor.y + SPACING.bodyBottomMargin
  const last = model.participants.length - 1
  return {
    width: columns.centres[last] + columns.widths[last] / 2 + SPACING.diagramMargin,
    height: bottom + SPACING.diagramBottomMargin,
    zones: model.zones
      .filter(({ members }) => members.length > 0)
      .map((zone) => zoneBand({ zone, columns, top, bottom })),
    participants: model.participants.map((participant, i) =>
      participantBox({ participant, x: columns.centres[i], width: columns.widths[i], top, headerHeight, bottom })),
    frames: placed.frames,
    body: placed.body
  }
}
