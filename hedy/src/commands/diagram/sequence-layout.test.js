import { readdir, readFile } from 'node:fs/promises'
import { describe, it, expect } from 'vitest'
import { sceneViolations } from '../../test-support/sequence-scene-checks.js'
import { layOutSequence } from './sequence-layout.js'
import { readSequenceSource } from './sequence-source.js'

const FIXTURES = new URL('./__fixtures__/sequence/', import.meta.url)
const fixtureNames = (await readdir(FIXTURES)).filter((name) => name.endsWith('.mmd'))
const sceneOfFixture = async (name) =>
  layOutSequence(readSequenceSource(await readFile(new URL(name, FIXTURES), 'utf8'), { label: name }))

const sceneOf = (...lines) => layOutSequence(readSequenceSource(['sequenceDiagram', ...lines].join('\n'), { label: 'flow.mmd' }))

const textsOf = (texts) => texts.map(({ text, bold, mono }) => ({ text, bold, mono }))

describe('layOutSequence keeps every promise on the INS Auth diagrams', () => {
  it.each(fixtureNames)('%s breaks no layout rule', async (name) => {
    expect(sceneViolations(await sceneOfFixture(name))).toEqual([])
  })
})

describe('layOutSequence refuses a model it cannot place', () => {
  it('names a participant the model does not declare, as an internal fault', () => {
    const model = {
      participants: [{ id: 'A', title: 'Alpha', caption: '' }],
      zones: [],
      events: [{ kind: 'message', from: 'A', to: 'B', style: 'solid', lines: ['Hello'] }],
      autonumber: false
    }
    expect(() => layOutSequence(model)).toThrow(expect.objectContaining({
      code: 'UNKNOWN',
      message: expect.stringContaining('The diagram names the participant B, which it does not declare.')
    }))
  })
})

describe('layOutSequence draws the services', () => {
  it('shows the title in bold and the repository name in monospace inside the service box', () => {
    const [participant] = sceneOf('participant RS as Routing Service<br>trade-imports-<br>routing-proxy').participants
    expect(textsOf(participant.texts)).toEqual([
      { text: 'Routing Service', bold: true, mono: false },
      { text: 'trade-imports-routing-proxy', bold: false, mono: true }
    ])
  })

  it('makes each service box as wide as its longer name, and no narrower than the narrowest box', () => {
    const [short, long] = sceneOf('participant A as A', 'participant L as Long name<br>trade-imports-a-very-long-repository-name').participants
    expect(long.rect.width).toBeGreaterThan(short.rect.width)
    expect(long.texts.every(({ bounds }) => bounds.right - bounds.left < long.rect.width)).toBe(true)
    expect(short.rect.width).toBe(sceneOf('participant B as B').participants[0].rect.width)
  })
})

describe('layOutSequence draws a zone without a name', () => {
  it('draws the band around its services with no label, as Mermaid draws a group without a name', () => {
    const model = {
      participants: [{ id: 'A', title: 'Alpha', caption: '' }],
      zones: [{ name: '', members: ['A'] }],
      events: [],
      autonumber: false
    }
    const [zone] = layOutSequence(model).zones
    expect(zone.members).toEqual(['A'])
    expect(zone.label).toBeUndefined()
  })
})

describe('layOutSequence draws zones from box blocks', () => {
  const zoned = sceneOf(
    'participant B as Browser',
    'box Public zone',
    'participant RS as Routing Service',
    'participant JF as Journey Frontend',
    'participant FD as Front Door',
    'end',
    'participant IDM as IDM',
    'B->>IDM: Sign in'
  )

  it('draws one band around three neighbouring services, labelled with the zone name in capitals', () => {
    expect(zoned.zones.map(({ label, members }) => ({ label: label.text, members }))).toEqual([
      { label: 'PUBLIC ZONE', members: ['RS', 'JF', 'FD'] }
    ])
  })

  it('places the service boxes of a diagram without zones as high as the bands of a zoned diagram', () => {
    const unzoned = sceneOf('participant B as Browser', 'participant IDM as IDM', 'B->>IDM: Sign in')
    expect(unzoned.zones).toEqual([])
    expect(unzoned.participants[0].rect.y).toBe(zoned.zones[0].rect.y)
  })
})

describe('layOutSequence draws the steps', () => {
  const scene = sceneOf(
    'participant A as Alpha',
    'participant B as Beta',
    'A->>B: GET /items<br>session cookie',
    'B-->>A: 200 items'
  )
  const [request, reply] = scene.body

  it('numbers each step at the lifeline of its sender', () => {
    expect([request.badge.text.text, reply.badge.text.text]).toEqual(['1', '2'])
    expect(request.badge.x).toBe(scene.participants[0].lifeline.x)
    expect(reply.badge.x).toBe(scene.participants[1].lifeline.x)
  })

  it('draws a solid arrow for ->> and a dashed arrow for -->>', () => {
    expect([request.arrow.dashed, reply.arrow.dashed]).toEqual([false, true])
  })

  it('sets a request line in monospace and the lines beneath it in the soft colour', () => {
    const [requestLine, header] = request.labels
    expect(requestLine.mono).toBe(true)
    expect(header.mono).toBe(false)
    expect(header.fill).not.toBe(reply.labels[0].fill)
  })
})

describe('layOutSequence draws notes and alternatives', () => {
  it('fits a note box to its longest line', () => {
    const [note] = sceneOf('participant A as Alpha', 'Note over A: A short line<br>and a much longer second line of the note').body
    const widest = Math.max(...note.texts.map(({ bounds }) => bounds.right - bounds.left))
    expect(note.rect.width).toBeGreaterThan(widest)
    expect(note.rect.width).toBeLessThan(widest + 40)
  })

  it('heads the frame alt. and each branch with its condition, and divides the branches', () => {
    const [frame] = sceneOf(
      'participant A as Alpha',
      'participant B as Beta',
      'alt Access confirmed',
      'A->>B: Refresh',
      'else Request fails',
      'B-->>A: Error',
      'end'
    ).frames
    expect([...frame.heading, ...frame.dividers.map(({ text }) => text)].map(({ text }) => text)).toEqual(['alt.', 'Access confirmed', 'Request fails'])
    expect(frame.dividers).toHaveLength(1)
    expect(frame.stepNumbers).toEqual([1, 2])
  })

  it('starts the condition 8 units after the end of the frame heading, so a longer heading cannot overlap the condition', () => {
    const [frame] = sceneOf('participant A as Alpha', 'participant B as Beta', 'alt Live', 'A->>B: Go', 'end').frames
    const [heading, condition] = frame.heading
    expect(condition.bounds.left - heading.bounds.right).toBeCloseTo(8, 6)
  })
})
