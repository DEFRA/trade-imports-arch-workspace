// stub.mjs - runs the editorial-review workflow with canned agents and records
// the order of the agent calls. The workflow source is the staged file the
// case names in WORKFLOW; its `export const meta` becomes a local and the body
// runs inside an async function whose parameters are the harness globals.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const src = readFileSync(process.env.WORKFLOW, 'utf8')
const body = src.replace(/^export const meta =/m, 'const meta =')
const run = new Function('agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow',
  `return (async () => {\n${body}\n})()`)

const basename = p => String(p).split('/').pop()
const HASHES = {
  'one.md': '1'.repeat(64),
  'two.md': '2'.repeat(64),
  'odd dir': null,
}
const hashOf = p => HASHES[basename(p)] || 'f'.repeat(64)

// `missing` maps a reviewer label to the value the canned agent returns in
// place of a result (null or undefined): the harness refusing or dropping
// that reviewer. `logs` records every log() call, so a scenario can assert
// that no completion line was written.
function harness(snapshot, missing = {}) {
  const calls = []
  const logs = []
  const seen = { paths: null }
  const agent = async (prompt, opts) => {
    const label = (opts && opts.label) || '?'
    calls.push(label)
    if (Object.prototype.hasOwnProperty.call(missing, label)) return missing[label]
    if (label === 'snapshot') {
      // The command line the workflow built, run through a real shell with the
      // program replaced by printf, so the quoting is what the shell decides.
      const cmd = prompt.split('\n').filter(l => l.startsWith('bash ')).pop()
      const words = cmd.replace(/^bash \S+ --hash-pages /, '')
      const printed = execFileSync('bash', ['-c', `printf '%s\\n' ${words}`], { encoding: 'utf8' })
      seen.paths = printed.split('\n').filter(Boolean)
      return snapshot(seen.paths)
    }
    if (label === 'packet') return { ok: true, lines: ['build-review-packet: packet built'] }
    if (label === 'scope') return { sections: [{ label: 'a', description: 'the first half' }, { label: 'b', description: 'the second half' }] }
    if (label.startsWith('drill:')) return { findings: [], retains: [] }
    if (label.startsWith('structural:')) return { findings: [], redundancies: [] }
    if (label === 'editor-pass') return { pages: [], order: [], patterns: [] }
    throw new Error('unexpected agent ' + label)
  }
  const parallel = thunks => Promise.all(thunks.map(t => t()))
  const pipeline = async () => { throw new Error('pipeline is not used by this workflow') }
  const phase = () => {}
  const log = m => { logs.push(String(m)) }
  const budget = { total: null, spent: () => 0, remaining: () => Infinity }
  const workflow = async () => { throw new Error('workflow() is not used by this workflow') }
  return { calls, logs, seen, globals: [agent, parallel, pipeline, phase, log, budget, workflow] }
}

const canned = paths => ({ pages: paths.map(p => ({ page: basename(p), hash: hashOf(p) })) })
const base = { frame: 'a reader', mode: 'review', intent: 'clarify' }
const ONE = '~/w/one.md'
const TWO = '~/w/two.md'

async function scenario(name, args, snapshot, check, missing) {
  const h = harness(snapshot || canned, missing)
  const [agent, parallel, pipeline, phase, log, budget, workflow] = h.globals
  let result = null
  let error = null
  try {
    result = await run(agent, parallel, pipeline, phase, log, args, budget, workflow)
  } catch (e) {
    error = e
  }
  const lines = check({ result, error, calls: h.calls, logs: h.logs, seen: h.seen })
  console.log(`scenario ${name}: calls ${h.calls.join(',') || '(none)'}`)
  for (const l of lines) console.log(`  ${l}`)
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const completed = logs => logs.some(m => m.startsWith('Review complete'))
const okResult = ({ result, error, logs }) => {
  if (error) throw error
  return [
    `version ${result.version}; mode ${result.mode}; intent ${result.intent}`,
    `units retains ${JSON.stringify(result.units.map(u => u.retains))}`,
    `completion logged: ${completed(logs)}`,
  ]
}
const expectError = ({ error, calls }, after) => {
  if (!error) throw new Error('expected the workflow to throw')
  return [`threw before ${after}: ${same(calls, calls.slice(0, calls.indexOf(after) === -1 ? calls.length : 0)) ? '' : ''}${error.message}`]
}

// 1. two docs: snapshot first, then every reviewer; the hashes are the canned map
await scenario('two-docs', { ...base, docs: [ONE, TWO] }, null, ctx => [
  ...okResult(ctx),
  `sourceHashes match: ${same(ctx.result.sourceHashes, { 'one.md': HASHES['one.md'], 'two.md': HASHES['two.md'] })}`,
])

// 2. one doc: snapshot first, then the work packet, then the scope read
await scenario('one-doc', { ...base, docs: [ONE] }, null, ctx => [
  ...okResult(ctx),
  `snapshot before packet before scope: ${ctx.calls.indexOf('snapshot') === 0 && ctx.calls.indexOf('packet') === 1 && ctx.calls.indexOf('scope') === 2}`,
])

// 3. two sections on two paths: the snapshot covers both pages, no scope read
await scenario('two-sections', { ...base, sections: [{ label: 'x', path: ONE, description: 'x' }, { label: 'y', path: TWO, description: 'y' }] }, null, ctx => [
  ...okResult(ctx),
  `sourceHashes match: ${same(ctx.result.sourceHashes, { 'one.md': HASHES['one.md'], 'two.md': HASHES['two.md'] })}`,
  `no scope: ${!ctx.calls.includes('scope')}`,
])

// 4. a path with shell-meaningful characters survives the real shell unchanged
const ODD = "~/w/odd dir/it's \"a\" $x `y`.md"
await scenario('odd-path', { ...base, docs: [ODD] }, null, ctx => [
  ...okResult(ctx),
  `shell printed the path unchanged: ${ctx.seen.paths.length === 1 && ctx.seen.paths[0] === ODD}`,
])

// 5. argument errors, each before any agent call
const argCases = [
  ['missing-mode', { frame: 'a reader', intent: 'clarify', docs: [ONE] }],
  ['unknown-mode', { frame: 'a reader', mode: 'edit', intent: 'clarify', docs: [ONE] }],
  ['missing-intent', { frame: 'a reader', mode: 'review', docs: [ONE] }],
  ['unknown-intent', { frame: 'a reader', mode: 'review', intent: 'default', docs: [ONE] }],
  ['docs-and-sections', { ...base, docs: [ONE], sections: [{ label: 'x', path: TWO, description: 'x' }] }],
]
for (const [name, args] of argCases) {
  await scenario(name, args, null, ctx => {
    if (!ctx.error) throw new Error(`${name}: expected the workflow to throw`)
    return [`threw with no agent call: ${ctx.calls.length === 0}; ${ctx.error.message}`]
  })
}

// 6. snapshot faults, each after the snapshot call and before any other agent
const afterSnapshotOnly = ctx => {
  if (!ctx.error) throw new Error('expected the workflow to throw')
  return [`threw after the snapshot only: ${same(ctx.calls, ['snapshot'])}; ${ctx.error.message}`]
}
await scenario('snapshot-short', { ...base, docs: [ONE, TWO] }, paths => ({ pages: [{ page: 'one.md', hash: HASHES['one.md'] }] }), afterSnapshotOnly)
await scenario('snapshot-malformed', { ...base, docs: [ONE, TWO] }, paths => ({ pages: [{ page: 'one.md', hash: 'xyz' }, { page: 'two.md', hash: HASHES['two.md'] }] }), afterSnapshotOnly)
await scenario('snapshot-conflict', { ...base, docs: [ONE, TWO] }, paths => ({ pages: [{ page: 'one.md', hash: HASHES['one.md'] }, { page: 'one.md', hash: HASHES['two.md'] }, { page: 'two.md', hash: HASHES['two.md'] }] }), afterSnapshotOnly)
await scenario('snapshot-short-one-doc', { ...base, docs: [ONE] }, paths => ({ pages: [] }), afterSnapshotOnly)

// 7. a missing reviewer: the harness refused or dropped one, so the canned agent
// returns null or undefined in its place; the workflow throws after the wave,
// names every missing label, returns nothing and logs no completion. A valid
// empty result (the two-docs scenario above) stays a return.
const wave = ['snapshot', 'packet', 'drill:one.md', 'drill:two.md', 'structural:one.md', 'structural:two.md', 'editor-pass']
const missingReviewer = expected => ctx => {
  if (!ctx.error) throw new Error('expected the workflow to throw')
  return [
    `wave ran in full: ${same(ctx.calls, wave)}`,
    `names every missing label: ${expected.every(l => ctx.error.message.includes(l))}`,
    `completion logged: ${completed(ctx.logs)}`,
    ctx.error.message,
  ]
}
await scenario('missing-drill', { ...base, docs: [ONE, TWO] }, null, missingReviewer(['drill:one.md']), { 'drill:one.md': null })
await scenario('missing-structural', { ...base, docs: [ONE, TWO] }, null, missingReviewer(['structural:two.md']), { 'structural:two.md': null })
await scenario('missing-editor', { ...base, docs: [ONE, TWO] }, null, missingReviewer(['editor-pass']), { 'editor-pass': null })
await scenario('missing-undefined', { ...base, docs: [ONE, TWO] }, null, missingReviewer(['drill:two.md']), { 'drill:two.md': undefined })
// 8. the work packet fails to build: the workflow throws before any reviewer reads
await scenario('packet-failed', { ...base, docs: [ONE, TWO] }, null, ctx => {
  if (!ctx.error) throw new Error('expected the workflow to throw')
  return [`threw before the wave: ${same(ctx.calls, ['snapshot', 'packet'])}; ${ctx.error.message}`]
}, { packet: { ok: false, lines: ['build-review-packet: no document at ~/w/two.md'] } })

await scenario('missing-several', { ...base, docs: [ONE, TWO] }, null, missingReviewer(['drill:one.md', 'structural:one.md', 'editor-pass']), { 'drill:one.md': null, 'structural:one.md': null, 'editor-pass': null })
