import { describe, it, expect } from 'vitest'
import { readSequenceSource } from './sequence-source.js'

const source = (...lines) => ['sequenceDiagram', ...lines].join('\n')
const read = (...lines) => readSequenceSource(source(...lines), { label: 'flow.mmd' })

const errorsOf = (text) => {
  try {
    readSequenceSource(text, { label: 'flow.mmd' })
  } catch (error) {
    return error.errors.map(({ code, message }) => ({ code, message }))
  }
  throw new Error('the source was read without an error')
}

describe('readSequenceSource reads participants and zones', () => {
  it('takes the title before the first <br> and joins the caption parts without a separator', () => {
    const model = read('participant RS as Routing Service<br>trade-imports-<br>routing-proxy')
    expect(model.participants).toEqual([{ id: 'RS', title: 'Routing Service', caption: 'trade-imports-routing-proxy' }])
  })

  it('titles a participant declared without "as" with its id', () => {
    expect(read('participant Browser').participants).toEqual([{ id: 'Browser', title: 'Browser', caption: '' }])
  })

  it('reads a box block as a zone holding the participants declared inside the block', () => {
    const model = read(
      'participant B as Browser',
      'box Public zone',
      '  participant RS as Routing Service',
      '  participant JF as Journey Frontend',
      'end'
    )
    expect(model.zones).toEqual([{ name: 'Public zone', members: ['RS', 'JF'] }])
    expect(model.participants.map(({ id }) => id)).toEqual(['B', 'RS', 'JF'])
  })

  it.each([
    ['box rgb(240, 240, 240) Public zone'],
    ['box rgba(0,0,0,0.1) Public zone'],
    ['box hsl(0, 0%, 95%) Public zone'],
    ['box transparent Public zone']
  ])('reads the zone name after the colour in %s', (boxLine) => {
    expect(read(boxLine, 'participant RS as Routing Service', 'end').zones[0].name).toBe('Public zone')
  })
})

describe('readSequenceSource reads the events in order', () => {
  it('reads a solid and a dashed message, splitting each label into lines at <br>', () => {
    const model = read(
      'participant A as Alpha',
      'participant B as Beta',
      'A->>B: GET /items<br>session cookie',
      'B-->>A: 200 items'
    )
    expect(model.events).toEqual([
      { kind: 'message', from: 'A', to: 'B', style: 'solid', lines: ['GET /items', 'session cookie'] },
      { kind: 'message', from: 'B', to: 'A', style: 'dashed', lines: ['200 items'] }
    ])
  })

  it('reads a note over one participant and a note over two', () => {
    const model = read(
      'participant A as Alpha',
      'participant B as Beta',
      'Note over A: Value read',
      'Note over A,B: Both wait<br>for two seconds'
    )
    expect(model.events).toEqual([
      { kind: 'note', over: ['A'], lines: ['Value read'] },
      { kind: 'note', over: ['A', 'B'], lines: ['Both wait', 'for two seconds'] }
    ])
  })

  it('reads alt and else as one alternative whose branches hold their own events, frames inside frames included', () => {
    const model = read(
      'participant A as Alpha',
      'participant B as Beta',
      'alt Outer one',
      '  A->>B: First',
      '  alt Inner',
      '    B-->>A: Second',
      '  end',
      'else Outer two',
      '  Note over B: Third',
      'end'
    )
    expect(model.events).toEqual([{
      kind: 'alternative',
      branches: [
        {
          condition: 'Outer one',
          events: [
            { kind: 'message', from: 'A', to: 'B', style: 'solid', lines: ['First'] },
            { kind: 'alternative', branches: [{ condition: 'Inner', events: [{ kind: 'message', from: 'B', to: 'A', style: 'dashed', lines: ['Second'] }] }] }
          ]
        },
        { condition: 'Outer two', events: [{ kind: 'note', over: ['B'], lines: ['Third'] }] }
      ]
    }])
  })

  it('skips blank lines, comments and the init line, and records autonumber', () => {
    const model = readSequenceSource([
      '%%{init: {"fontSize": 14}}%%',
      'sequenceDiagram',
      '',
      '%% a comment',
      'autonumber',
      'participant A as Alpha'
    ].join('\n'), { label: 'flow.mmd' })
    expect(model).toEqual({ participants: [{ id: 'A', title: 'Alpha', caption: '' }], zones: [], events: [], autonumber: true })
  })

  it('records autonumber as false when the source does not say autonumber', () => {
    expect(read('participant A as Alpha').autonumber).toBe(false)
  })
})

describe('readSequenceSource refuses a source it cannot draw', () => {
  it('refuses a file that is not a sequence diagram, naming the line and the diagram type', () => {
    expect(errorsOf('flowchart LR\n  A --> B')).toEqual([{
      code: 'PARSE',
      message: 'flow.mmd:1: the file is a "flowchart LR" diagram, and the renderer draws sequence diagrams. Draw this diagram with Mermaid, or start the file with sequenceDiagram.'
    }])
  })

  it('refuses an empty file, asking for the sequenceDiagram line', () => {
    expect(errorsOf('\n%% nothing\n')).toEqual([{
      code: 'PARSE',
      message: 'flow.mmd:1: the file holds no diagram. Start the file with sequenceDiagram, then the participants and messages.'
    }])
  })

  it.each([
    ['loop Every minute', 'loop'],
    ['A-xB: no answer', '-x'],
    ['actor U as User', 'actor'],
    ['Note right of A: aside', 'Note right of'],
    ['activate A', 'activate']
  ])('refuses %s with the line number and the construct %s', (line, construct) => {
    const [error] = errorsOf(source('participant A as Alpha', 'participant B as Beta', line))
    expect(error.code).toBe('PARSE')
    expect(error.message).toContain('flow.mmd:4:')
    expect(error.message).toContain(`"${construct}"`)
    expect(error.message).toContain('Rewrite the line with participant, box, ->>, -->>, Note over, alt, else and end')
  })

  it('refuses a message to a participant the file does not declare, naming the participant and the line to add', () => {
    expect(errorsOf(source('participant A as Alpha', 'A->>B: Hello'))).toEqual([{
      code: 'PARSE',
      message: 'flow.mmd:3: the message names B, which no participant line declares. Add "participant B as <title>" before the first message.'
    }])
  })

  it('refuses a note over a participant the file does not declare', () => {
    expect(errorsOf(source('participant A as Alpha', 'Note over A,C: Shared'))[0].message)
      .toBe('flow.mmd:3: the note names C, which no participant line declares. Add "participant C as <title>" before the first message.')
  })

  it.each([
    [['participant A as Alpha', 'participant A as Again'], 'flow.mmd:3: the participant A is declared twice. Give the second participant its own id.'],
    [['participant A as Alpha', 'else Other'], 'flow.mmd:3: else appears outside an alt block. Put the else line between alt and end.'],
    [['participant A as Alpha', 'end'], 'flow.mmd:3: end closes no open alt or box block. Remove the line, or open the block it closes.'],
    [['participant A as Alpha', 'alt Some'], 'flow.mmd:3: the alt block opened here has no end line. Add end after the last line of the block.'],
    [['box Zone', 'participant A as Alpha'], 'flow.mmd:2: the box block opened here has no end line. Add end after the last participant of the box.'],
    [['participant A as Alpha', 'alt Some', 'box Zone', 'end', 'end'], 'flow.mmd:4: a box block sits inside an alt block, and a box holds participants. Move the box to the participant lines at the top of the file.'],
    [['box Outer', 'box Inner', 'end', 'end'], 'flow.mmd:3: a box block sits inside another box block. Close the first box with end before the second box opens.'],
    [['box Zone', 'participant A as Alpha', 'Note over A: inside', 'end'], 'flow.mmd:4: a box block holds participant lines and nothing else. Move this line after the end of the box.']
  ])('refuses the block structure of %j', (lines, message) => {
    expect(errorsOf(source(...lines))).toEqual([{ code: 'PARSE', message }])
  })

  it('reports every refused line of the file in one run, in line order', () => {
    const errors = errorsOf(source('participant A as Alpha', 'loop Every minute', 'A->>B: Hello', 'end'))
    expect(errors.map(({ message }) => message.split(' ')[0])).toEqual(['flow.mmd:3:', 'flow.mmd:4:', 'flow.mmd:5:'])
  })
})
