import { HedyError } from '../../errors.js'

const DRAWN_CONSTRUCTS = 'participant, box, ->>, -->>, Note over, alt, else and end'

const ROOT = Object.freeze({ kind: 'root', events: [] })

const initialState = Object.freeze({ participants: [], zones: [], autonumber: false, errors: [], blocks: [ROOT] })

const refused = (state, lineNumber, message) => ({ ...state, errors: [...state.errors, { lineNumber, message }] })

const topBlock = ({ blocks }) => blocks.at(-1)

const insideBox = (state) => topBlock(state).kind === 'box'

const insideAlt = ({ blocks }) => blocks.some(({ kind }) => kind === 'alt')

const isDeclared = ({ participants }, id) => participants.some((participant) => participant.id === id)

const undeclaredIn = (state, ids) => ids.find((id) => !isDeclared(state, id))

const withTopBlock = (state, update) => ({ ...state, blocks: [...state.blocks.slice(0, -1), update(topBlock(state))] })

const withEventAdded = (block, event) => {
  if (block.kind === 'root') return { ...block, events: [...block.events, event] }
  if (block.kind === 'alt') {
    const branches = block.branches.with(-1, { ...block.branches.at(-1), events: [...block.branches.at(-1).events, event] })
    return { ...block, branches }
  }
  return block
}

const eventAdded = (state, lineNumber, event) => insideBox(state)
  ? refused(state, lineNumber, 'a box block holds participant lines and nothing else. Move this line after the end of the box.')
  : withTopBlock(state, (block) => withEventAdded(block, event))

const undeclaredRefusal = (state, lineNumber, { what, id }) =>
  refused(state, lineNumber, `the ${what} names ${id}, which no participant line declares. Add "participant ${id} as <title>" before the first message.`)

const readParticipant = (state, lineNumber, [, id, label]) => {
  if (isDeclared(state, id)) return refused(state, lineNumber, `the participant ${id} is declared twice. Give the second participant its own id.`)
  const [title, ...captionParts] = (label ?? id).split('<br>')
  const declared = { ...state, participants: [...state.participants, { id, title, caption: captionParts.join('') }] }
  return insideBox(state) ? withTopBlock(declared, (box) => ({ ...box, members: [...box.members, id] })) : declared
}

const boxPlacementRefusal = (state) => {
  if (insideAlt(state)) return 'a box block sits inside an alt block, and a box holds participants. Move the box to the participant lines at the top of the file.'
  if (insideBox(state)) return 'a box block sits inside another box block. Close the first box with end before the second box opens.'
  return undefined
}

const zoneName = (text) => text.replace(/^(?:transparent|(?:rgba?|hsla?)\([^)]*\))\s*/i, '')

const readBox = (state, lineNumber, [, text]) => {
  const refusal = boxPlacementRefusal(state)
  const checked = refusal === undefined ? state : refused(state, lineNumber, refusal)
  return { ...checked, blocks: [...checked.blocks, { kind: 'box', lineNumber, name: zoneName(text ?? ''), members: [] }] }
}

const readMessage = (state, lineNumber, [, from, arrow, to, label]) => {
  const undeclared = undeclaredIn(state, [from, to])
  if (undeclared !== undefined) return undeclaredRefusal(state, lineNumber, { what: 'message', id: undeclared })
  return eventAdded(state, lineNumber, { kind: 'message', from, to, style: arrow === '-->>' ? 'dashed' : 'solid', lines: label.split('<br>') })
}

const readNote = (state, lineNumber, [, first, second, label]) => {
  const over = second === undefined ? [first] : [first, second]
  const undeclared = undeclaredIn(state, over)
  if (undeclared !== undefined) return undeclaredRefusal(state, lineNumber, { what: 'note', id: undeclared })
  return eventAdded(state, lineNumber, { kind: 'note', over, lines: label.split('<br>') })
}

const readAlt = (state, lineNumber, [, condition]) => {
  const checked = insideBox(state)
    ? refused(state, lineNumber, 'a box block holds participant lines and nothing else. Move this line after the end of the box.')
    : state
  return { ...checked, blocks: [...checked.blocks, { kind: 'alt', lineNumber, branches: [{ condition: condition ?? '', events: [] }] }] }
}

const readElse = (state, lineNumber, [, condition]) => topBlock(state).kind === 'alt'
  ? withTopBlock(state, (alt) => ({ ...alt, branches: [...alt.branches, { condition: condition ?? '', events: [] }] }))
  : refused(state, lineNumber, 'else appears outside an alt block. Put the else line between alt and end.')

const closed = (state, block) => {
  const remaining = { ...state, blocks: state.blocks.slice(0, -1) }
  if (block.kind === 'alt') return withTopBlock(remaining, (parent) => withEventAdded(parent, { kind: 'alternative', branches: block.branches }))
  if (topBlock(remaining).kind !== 'root') return remaining
  return { ...remaining, zones: [...remaining.zones, { name: block.name, members: block.members }] }
}

const readEnd = (state, lineNumber) => state.blocks.length === 1
  ? refused(state, lineNumber, 'end closes no open alt or box block. Remove the line, or open the block it closes.')
  : closed(state, topBlock(state))

const readAutonumber = (state) => ({ ...state, autonumber: true })

const LINE_READERS = [
  { pattern: /^participant (\w+)(?: as (.+))?$/, read: readParticipant },
  { pattern: /^box(?:\s+(.*))?$/, read: readBox },
  { pattern: /^(\w+)\s*(-->>|->>)\s*(\w+)\s*:\s*(.*)$/, read: readMessage },
  { pattern: /^note over (\w+)(?:\s*,\s*(\w+))?\s*:\s*(.*)$/i, read: readNote },
  { pattern: /^alt(?:\s+(.*))?$/, read: readAlt },
  { pattern: /^else(?:\s+(.*))?$/, read: readElse },
  { pattern: /^end$/, read: readEnd },
  { pattern: /^autonumber\b/, read: readAutonumber }
]

const constructOf = (line) =>
  line.match(/^\w+\s*(-{1,2}(?:>>|>|x|\))[+-]?)/)?.[1] ??
  line.match(/^note (?:right|left) of/i)?.[0] ??
  line.split(/\s/)[0]

const readLine = (state, { text, lineNumber }) => {
  const reader = LINE_READERS.map(({ pattern, read }) => ({ match: text.match(pattern), read })).find(({ match }) => match !== null)
  return reader === undefined
    ? refused(state, lineNumber, `"${constructOf(text)}" is not a construct the renderer draws. Rewrite the line with ${DRAWN_CONSTRUCTS}, or draw this diagram with Mermaid.`)
    : reader.read(state, lineNumber, reader.match)
}

const unclosedBlockRefusals = (state) => state.blocks.slice(1).reduce((sofar, { kind, lineNumber }) => {
  const lastLine = kind === 'box' ? 'the last participant of the box' : 'the last line of the block'
  return refused(sofar, lineNumber, `the ${kind} block opened here has no end line. Add end after ${lastLine}.`)
}, state)

const headerRefusal = (header) => {
  if (header === undefined) return { lineNumber: 1, message: 'the file holds no diagram. Start the file with sequenceDiagram, then the participants and messages.' }
  if (header.text === 'sequenceDiagram') return undefined
  return { lineNumber: header.lineNumber, message: `the file is a "${header.text}" diagram, and the renderer draws sequence diagrams. Draw this diagram with Mermaid, or start the file with sequenceDiagram.` }
}

const meaningfulLines = (text) => text.split(/\r?\n/)
  .map((line, index) => ({ text: line.trim(), lineNumber: index + 1 }))
  .filter(({ text: line }) => line !== '' && !line.startsWith('%%'))

const sourceErrors = (label, errors) => {
  const hedyErrors = errors
    .toSorted((a, b) => a.lineNumber - b.lineNumber)
    .map(({ lineNumber, message }) => new HedyError('PARSE', `${label}:${lineNumber}: ${message}`))
  return new AggregateError(hedyErrors, `${label}: the source holds ${hedyErrors.length} lines the renderer cannot draw`)
}

const readBody = (lines) => unclosedBlockRefusals(lines.reduce(readLine, initialState))

/**
 * Returns the diagram model of a Mermaid sequence source: the participants
 * in declaration order, the zones that box blocks declare, the events with
 * each alternative holding its branches, and whether the source says
 * autonumber. Throws an AggregateError holding one PARSE error per line the
 * renderer cannot draw, each naming label, the line number and the change to
 * make.
 *
 * @param {string} text
 * @param {{ label: string }} options
 */
export const readSequenceSource = (text, { label }) => {
  const [header, ...lines] = meaningfulLines(text)
  const refusal = headerRefusal(header)
  if (refusal !== undefined) throw sourceErrors(label, [refusal])
  const { participants, zones, autonumber, errors, blocks } = readBody(lines)
  if (errors.length > 0) throw sourceErrors(label, errors)
  return { participants, zones, events: blocks[0].events, autonumber }
}
