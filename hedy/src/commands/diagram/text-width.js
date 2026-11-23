const HELVETICA_WIDTHS = new Map(Object.entries({
  ' ': 278,
  '!': 278,
  '"': 355,
  '#': 556,
  $: 556,
  '%': 889,
  '&': 667,
  "'": 191,
  '(': 333,
  ')': 333,
  '*': 389,
  '+': 584,
  ',': 278,
  '-': 333,
  '.': 278,
  '/': 278,
  ':': 278,
  ';': 278,
  '<': 584,
  '=': 584,
  '>': 584,
  '?': 556,
  '@': 1015,
  '[': 278,
  ']': 278,
  _: 556,
  '{': 334,
  '}': 334,
  A: 667,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 500,
  K: 667,
  L: 556,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  a: 556,
  b: 556,
  c: 500,
  d: 556,
  e: 556,
  f: 278,
  g: 556,
  h: 556,
  i: 222,
  j: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  q: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 500
}))

const characterWidth = (character) =>
  HELVETICA_WIDTHS.get(character) ?? (/^\p{Nd}$/u.test(character) ? 556 : 600)

/**
 * Returns the estimated width of text set at size, from Helvetica's advance
 * widths per 1000 units. Bold text is 7% wider, and monospace text gives
 * each character 0.6 of the size.
 *
 * @param {string} text
 * @param {number} size
 * @param {{ bold?: boolean, mono?: boolean }} [options]
 * @returns {number}
 */
export const textWidth = (text, size, { bold = false, mono = false } = {}) => {
  const characters = [...text]
  if (mono) return characters.length * size * 0.6
  const width = characters.reduce((sum, character) => sum + characterWidth(character), 0) * size / 1000
  return bold ? width * 1.07 : width
}
