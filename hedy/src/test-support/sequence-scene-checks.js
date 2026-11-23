const quoted = ({ text }) => `"${text}"`

const contains = (outer, inner) =>
  inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom

const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

const boundsOfRect = ({ x, y, width, height }) => ({ left: x, right: x + width, top: y, bottom: y + height })

const stepsOf = (scene) => scene.body.filter(({ kind }) => kind === 'step')

const frameTexts = ({ heading, dividers }) => [...heading, ...dividers.map(({ text }) => text)]

const notesOf = (scene) => scene.body.filter(({ kind }) => kind === 'note')

const lifelineX = (scene, id) => scene.participants.find((participant) => participant.id === id).lifeline.x

const allTexts = (scene) => [
  ...scene.zones.map(({ label }) => label),
  ...scene.participants.flatMap(({ texts }) => texts),
  ...scene.frames.flatMap(frameTexts),
  ...stepsOf(scene).flatMap(({ labels }) => labels),
  ...notesOf(scene).flatMap(({ texts }) => texts)
]

const labelsBetweenLifelines = (scene) => stepsOf(scene).flatMap((step) => {
  const [left, right] = [lifelineX(scene, step.from), lifelineX(scene, step.to)].sort((a, b) => a - b)
  return step.labels
    .filter(({ bounds }) => bounds.left < left || bounds.right > right)
    .map((label) => `step ${step.number} label ${quoted(label)} crosses a lifeline of ${step.from} or ${step.to}`)
})

const textsInside = (owner, rect, texts) => texts
  .filter(({ bounds }) => !contains(boundsOfRect(rect), bounds))
  .map((text) => `${owner} text ${quoted(text)} runs outside its box`)

const textsInsideBoxes = (scene) => [
  ...scene.participants.flatMap(({ id, rect, texts }) => textsInside(`participant ${id}`, rect, texts)),
  ...notesOf(scene).flatMap(({ over, rect, texts }) => textsInside(`note over ${over.join(',')}`, rect, texts)),
  ...scene.zones.flatMap(({ name, rect, label }) => textsInside(`zone ${name}`, rect, [label])),
  ...scene.frames.flatMap((frame, index) => textsInside(`frame ${index + 1}`, frame.rect, frameTexts(frame)))
]

const textsInsideDiagram = (scene) => {
  const diagram = { left: 0, right: scene.width, top: 0, bottom: scene.height }
  return allTexts(scene)
    .filter(({ bounds }) => !contains(diagram, bounds))
    .map((text) => `text ${quoted(text)} runs past the edge of the diagram`)
}

const textsApart = (scene) => {
  const texts = allTexts(scene)
  return texts.flatMap((text, index) => texts.slice(index + 1)
    .filter((other) => overlaps(text.bounds, other.bounds))
    .map((other) => `text ${quoted(text)} overlaps text ${quoted(other)}`))
}

const zonesCoverTheirServices = (scene) => scene.zones.flatMap((zone) => {
  const band = boundsOfRect(zone.rect)
  return scene.participants.flatMap(({ id, rect }) => {
    const member = zone.members.includes(id)
    if (member && !contains(band, boundsOfRect(rect))) return [`zone ${zone.name} does not cover its service ${id}`]
    if (!member && overlaps(band, boundsOfRect(rect))) return [`zone ${zone.name} covers ${id}, which sits outside the zone`]
    return []
  })
})

const stepBounds = ({ arrow, badge, labels }) => [
  { left: Math.min(arrow.x1, arrow.x2), right: Math.max(arrow.x1, arrow.x2), top: arrow.y, bottom: arrow.y },
  { left: badge.x - badge.r, right: badge.x + badge.r, top: badge.y - badge.r, bottom: badge.y + badge.r },
  ...labels.map(({ bounds }) => bounds)
]

const framesContainTheirSteps = (scene) => scene.frames.flatMap((frame, index) => {
  const outline = boundsOfRect(frame.rect)
  const steps = stepsOf(scene).filter(({ number }) => frame.stepNumbers.includes(number))
  return steps
    .filter((step) => !stepBounds(step).every((bounds) => contains(outline, bounds)))
    .map(({ number }) => `frame ${index + 1} does not contain its step ${number}`)
})

const stepsInOrder = (scene) => stepsOf(scene).flatMap((step, index, steps) => [
  step.number === index + 1 ? undefined : `step ${index + 1} is numbered ${step.number}`,
  index === 0 || step.arrow.y > steps[index - 1].arrow.y ? undefined : `step ${step.number} is not below step ${steps[index - 1].number}`
].filter((problem) => problem !== undefined))

export const SCENE_CHECKS = Object.freeze({
  labelsBetweenLifelines,
  textsInsideBoxes,
  textsInsideDiagram,
  textsApart,
  zonesCoverTheirServices,
  framesContainTheirSteps,
  stepsInOrder
})

/**
 * Returns, in plain words, every way the scene breaks a promise of the
 * sequence diagram requirements: a label outside its lifelines, a text outside
 * its box or the diagram, two texts that overlap, a zone that misses a member
 * or covers another service, a frame that misses one of its steps, or steps
 * out of order. An empty list means the scene keeps every promise.
 *
 * @param {object} scene
 * @returns {string[]}
 */
export const sceneViolations = (scene) => Object.values(SCENE_CHECKS).flatMap((check) => check(scene))
