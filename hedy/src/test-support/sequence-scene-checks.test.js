import { describe, it, expect } from 'vitest'
import { layOutSequence } from '../commands/diagram/sequence-layout.js'
import { readSequenceSource } from '../commands/diagram/sequence-source.js'
import { SCENE_CHECKS, sceneViolations } from './sequence-scene-checks.js'

const sound = layOutSequence(readSequenceSource([
  'sequenceDiagram',
  'participant B as Browser',
  'box Public zone',
  'participant RS as Routing Service',
  'participant JF as Journey Frontend',
  'end',
  'participant SS as Session Service',
  'alt Live session',
  'B->>RS: GET /page',
  'RS->>JF: GET /page',
  'Note over JF: Cookie read',
  'else No session',
  'JF-->>B: 302 sign in',
  'end',
  'JF->>SS: GET /sessions/assertion'
].join('\n'), { label: 'flow.mmd' }))

const shiftText = (text, dx, dy = 0) => {
  text.x += dx
  text.y += dy
  text.bounds = { left: text.bounds.left + dx, right: text.bounds.right + dx, top: text.bounds.top + dy, bottom: text.bounds.bottom + dy }
}

const broken = (change) => {
  const scene = structuredClone(sound)
  change(scene)
  return scene
}

describe('sceneViolations', () => {
  it('finds nothing wrong with a sound scene', () => {
    expect(sceneViolations(sound)).toEqual([])
  })

  it.each([
    ['labelsBetweenLifelines', (scene) => shiftText(scene.body[0].labels[0], -200), 'step 1 label "GET /page" crosses a lifeline of B or RS'],
    ['textsInsideBoxes', (scene) => shiftText(scene.participants[1].texts[0], 0, 80), 'participant RS text "Routing Service" runs outside its box'],
    ['textsInsideDiagram', (scene) => { scene.width = 100 }, 'text "Session Service" runs past the edge of the diagram'],
    ['textsApart', (scene) => {
      const [first, second] = [scene.body[0].labels[0], scene.body[1].labels[0]]
      shiftText(second, first.x - second.x, first.y - second.y)
    }, 'text "GET /page" overlaps text "GET /page"'],
    ['zonesCoverTheirServices', (scene) => { scene.zones[0].rect.width += 400 }, 'zone Public zone covers SS, which sits outside the zone'],
    ['framesContainTheirSteps', (scene) => { scene.frames[0].rect.height = 10 }, 'frame 1 does not contain its step 1'],
    ['stepsInOrder', (scene) => { scene.body[0].number = 7 }, 'step 1 is numbered 7']
  ])('%s reports a scene that breaks its rule', (check, change, violation) => {
    expect(SCENE_CHECKS[check](broken(change))).toContain(violation)
  })
})
