export const meta = {
  name: 'editorial-review',
  description: 'Fan-out editorial review of a document or document set: per-unit drill reviewers, a structural pass and a cold editor pass; returns closable version 3 findings, retains and questions and never edits',
  whenToUse: 'When the editorial skill reviews a whole document or a set of documents and the user asks for the workflow. Args: docs (array of paths in the ~/ form) or sections (array of {label, path, description}), never both; frame (the reader frame, required); mode (review or revise, required); intent (distil or clarify, required); documentMode (the Diátaxis mode, default explanation); notes. Build the result with build-triage.sh --from-run <run id>.',
  phases: [
    { title: 'Snapshot', detail: 'hash every page before any reviewer reads one' },
    { title: 'Scope', detail: 'split a single document into review units' },
    { title: 'Review', detail: 'drill each unit; structural pass; cold editor pass' },
  ],
}

const BRIEF = '~/trade-imports-arch-workspace/.claude/skills/editorial/references/review-brief.md'
const SCRATCH = '~/trade-imports-arch-workspace/.claude/workareas/editorial/review'
const HASHER = 'bash ~/trade-imports-arch-workspace/.claude/tools/editorial-triage/build-triage.sh --hash-pages'
const BUILD = 'bash ~/trade-imports-arch-workspace/.claude/tools/editorial-triage/build-triage.sh --from-run <run id from the Workflow tool result> --dir ~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<docset>-<date>'

// The harness has passed args as a JSON string before; accept both forms.
let input = args
if (typeof input === 'string') {
  try {
    input = JSON.parse(input)
  } catch (e) {
    throw new Error('args arrived as a string that is not JSON. Pass an object ({docs, frame, mode, intent, documentMode, notes}) as the Workflow args, or embed the inputs in a session copy of this script and run it with scriptPath.')
  }
}
if (!input || !input.frame) throw new Error('args.frame (the step-1 reader frame) is required')

// The run's two decisions, from the contract: what the run returns, and what
// the reviewers look for. Neither has a default.
const MODES = ['review', 'revise']
const INTENTS = ['distil', 'clarify']
if (input.mode === undefined || input.mode === null || input.mode === '') throw new Error('args.mode is required: review (findings, retains and questions; no page changes) or revise (the closing plan applies the batch)')
if (!MODES.includes(input.mode)) throw new Error(`args.mode must be review or revise, got ${JSON.stringify(input.mode)}`)
if (input.intent === undefined || input.intent === null || input.intent === '') throw new Error('args.intent is required: distil (remove whole units, never grow) or clarify (split, list, reorder and reword; change no claim)')
if (!INTENTS.includes(input.intent)) throw new Error(`args.intent must be distil or clarify, got ${JSON.stringify(input.intent)}`)
const frame = input.frame
const mode = input.mode
const intent = input.intent
// The Diátaxis mode of the document, a property of the text and not a run decision.
const documentMode = input.documentMode || 'explanation'
const notes = input.notes || 'none'

// One page set for every reader: the paths of the sections when given, else
// the docs. Giving both would leave two scopes, so that is an error.
const hasDocs = Array.isArray(input.docs) && input.docs.length > 0
const hasSections = Array.isArray(input.sections) && input.sections.length > 0
if (hasDocs && hasSections) throw new Error('args.docs and args.sections are alternatives: give one page set, not both')
if (!hasDocs && !hasSections) throw new Error('args.docs (array of paths) or args.sections (array of {label, path, description}) is required')
const docs = hasSections ? [...new Set(input.sections.map(s => s.path))] : [...new Set(input.docs)]
const basename = p => String(p).split('/').pop()

// The result schemas carry types, enums and required lists only. What each
// field is for, and when a conditional field is required, is the brief's,
// which every reviewer reads first. The harness refuses to spawn an agent
// whose return schema exceeds 4,096 characters of its own serialisation
// (Claude Code 2.1.266); descriptions here once pushed every reviewer past it.
// Field set and values: the record contract,
// .claude/skills/editorial-triage/assets/editorial-triage-schema.md.
const ANCHOR = {
  type: 'object',
  required: ['page', 'quote'],
  properties: {
    page: { type: 'string' },
    line: { type: ['integer', 'null'] },
    quote: { type: 'string' },
  },
}

const INVENTORY = {
  type: 'object',
  required: ['actors', 'steps', 'existingDiagram'],
  properties: {
    actors: { type: 'array', items: { type: 'string' } },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['actor', 'action', 'condition', 'quote'],
        properties: {
          actor: { type: 'string' },
          action: { type: 'string' },
          condition: { type: ['string', 'null'] },
          quote: { type: 'string' },
        },
      },
    },
    existingDiagram: { type: ['string', 'null'] },
  },
}

const INTRODUCED = {
  type: 'object',
  required: ['text', 'status', 'source'],
  properties: {
    text: { type: 'string' },
    status: { type: 'string', enum: ['supported', 'unsupported'] },
    source: { type: ['string', 'null'] },
  },
}

const CHANGE = {
  type: 'object',
  required: ['kind', 'original', 'revised'],
  properties: {
    kind: { type: 'string', enum: ['split', 'list', 'reword', 'move', 'merge', 'remove'] },
    original: { type: 'string' },
    revised: { type: 'string' },
  },
}

const FINDING = {
  type: 'object',
  required: ['page', 'quote', 'kind', 'severity', 'defect', 'point', 'bearing', 'removes', 'action', 'basis', 'guess'],
  properties: {
    page: { type: 'string' },
    line: { type: ['integer', 'null'] },
    quote: { type: 'string' },
    kind: { type: 'string', enum: ['fact', 'citation', 'contradiction', 'absolute', 'omission', 'ambiguity', 'term', 'reference', 'repetition', 'compression', 'flow', 'residue', 'presentation'] },
    severity: { type: 'string', enum: ['S1', 'S2', 'S3', 'S4', 'S5'] },
    defect: { type: 'string' },
    point: { type: 'string' },
    bearing: { type: 'string', enum: ['central', 'supporting', 'tangential'] },
    removes: { type: 'string' },
    action: { type: 'string', enum: ['delete', 'shorten', 'correct', 'reconcile', 'rewrite', 'rename', 'split', 'list', 'move', 'restructure', 'expand', 'point', 'qualify', 'own', 'ask'] },
    basis: { type: 'string', enum: ['rule', 'source', 'set', 'inference', 'author'] },
    cites: { type: 'array', items: { type: 'string' } },
    before: { type: 'string' },
    after: { type: 'string' },
    loss: { type: 'string' },
    question: { type: 'string' },
    owner: { type: 'string' },
    related: { type: 'array', items: ANCHOR },
    moveTo: { type: 'string' },
    guess: { type: 'boolean' },
    status: { type: 'string', enum: ['broken', 'circular', 'unlocated'] },
    inventory: INVENTORY,
    introduced: { type: 'array', items: INTRODUCED },
    changes: { type: 'array', items: CHANGE },
  },
}

const RETAIN = {
  type: 'object',
  required: ['quote', 'reason'],
  properties: {
    line: { type: ['integer', 'null'] },
    quote: { type: 'string' },
    reason: { type: 'string' },
  },
}

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings', 'retains'],
  properties: {
    findings: { type: 'array', items: FINDING },
    retains: { type: 'array', items: RETAIN },
  },
}

const SECTIONS_SCHEMA = {
  type: 'object',
  required: ['sections'],
  properties: {
    sections: {
      type: 'array',
      items: {
        type: 'object',
        required: ['label', 'description'],
        properties: {
          label: { type: 'string', description: 'short unit name' },
          description: { type: 'string', description: 'the headings and content the unit covers' },
        },
      },
    },
  },
}

const STRUCTURAL_SCHEMA = {
  type: 'object',
  required: ['findings', 'redundancies'],
  properties: {
    findings: { type: 'array', items: FINDING },
    redundancies: {
      type: 'array',
      items: {
        type: 'object',
        required: ['fact', 'home', 'occurrences'],
        properties: {
          fact: { type: 'string' },
          home: ANCHOR,
          occurrences: { type: 'array', items: FINDING },
        },
      },
    },
  },
}

const EDITOR_SCHEMA = {
  type: 'object',
  required: ['pages', 'order', 'patterns'],
  properties: {
    pages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['page', 'verdict', 'opening', 'carriedAway', 'findings', 'retains'],
        properties: {
          page: { type: 'string' },
          verdict: { type: 'string', enum: ['finishes', 'stalls', 'misleads'] },
          opening: { type: 'string' },
          carriedAway: { type: 'string' },
          findings: { type: 'array', items: FINDING },
          retains: { type: 'array', items: RETAIN },
        },
      },
    },
    order: { type: 'array', items: FINDING },
    patterns: {
      type: 'array',
      items: {
        type: 'object',
        required: ['pattern', 'instances', 'finding'],
        properties: {
          pattern: { type: 'string' },
          instances: { type: 'array', items: ANCHOR },
          finding: FINDING,
        },
      },
    },
  },
}

const HASH_SCHEMA = {
  type: 'object',
  required: ['pages'],
  properties: {
    pages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['page', 'hash'],
        properties: {
          page: { type: 'string' },
          hash: { type: 'string' },
        },
      },
    },
  },
}

const safeLabel = s => s.replace(/[^A-Za-z0-9._-]/g, '-')
// A path as one shell word: single-quoted, with a single quote inside the
// path written as '\'' so a space, a double quote, a dollar sign or a
// backtick is data.
const shellWord = p => `'${String(p).replace(/'/g, `'\\''`)}'`

// Every page is hashed by the build's own hash function before any agent
// reads a page, so the build can tell a review of the page as it stood from
// a review of an older text. A page edited after this is the build's stale
// case. Nothing is copied or locked.
phase('Snapshot')
const hashCommand = `${HASHER} ${docs.map(shellWord).join(' ')}`
const snapshot = await agent(
  `Run exactly this command with the Bash tool, as one call, and return its output as pages: one entry per key of the JSON object it prints, page the key and hash the value. Do not read, open or change any page; do not compute a hash yourself. If the command fails, return no pages and put its error message in your text.\n\n${hashCommand}`,
  // Mechanical: one command, one JSON object copied out.
  { label: 'snapshot', phase: 'Snapshot', schema: HASH_SCHEMA, agentType: 'general-purpose', model: 'sonnet', effort: 'low' },
)
const sourceHashes = {}
for (const e of (snapshot && snapshot.pages) || []) {
  if (!/^[0-9a-f]{64}$/.test(String(e.hash))) throw new Error(`the snapshot returned a hash that is not a SHA-256 for ${e.page}: ${JSON.stringify(e.hash)}`)
  if (e.page in sourceHashes && sourceHashes[e.page] !== e.hash) throw new Error(`the snapshot returned two different hashes for ${e.page}`)
  sourceHashes[e.page] = e.hash
}
for (const d of docs) {
  if (!(basename(d) in sourceHashes)) throw new Error(`the snapshot returned no hash for ${basename(d)}; every page under review is hashed before it is read`)
}

// Resolve the review units: explicit sections beat docs; several docs mean one unit per file;
// a single doc is split by a scope agent.
let units = []
if (hasSections) {
  units = input.sections
} else if (docs.length > 1) {
  units = docs.map(d => ({ label: basename(d), path: d, description: 'the whole file' }))
} else {
  phase('Scope')
  const doc = docs[0]
  const split = await agent(
    `Read the document at "${doc}" (use the Read tool; quote the path). Split it into review units for a fan-out editorial review: group by heading, merge small neighbouring sections so each unit is substantial, and return at most 6 units. Each unit needs a short label and a description naming the headings it covers. Do not review anything; return only the split.`,
    // Decomposition only, no judgment about the prose: a cheaper tier is enough.
    { label: 'scope', schema: SECTIONS_SCHEMA, agentType: 'general-purpose', model: 'sonnet', effort: 'low' },
  )
  units = split.sections.map(s => ({ label: s.label, path: doc, description: s.description }))
}

const docsQuoted = docs.map(d => `"${d}"`).join(', ')

const common = [
  `Reader frame (the lens for every finding): ${frame}`,
  `Output mode: ${mode}`,
  `Review intent: ${intent}`,
  `Document mode: ${documentMode}`,
  `Run notes: ${notes}`,
  `Documents under review, in reading order: ${docsQuoted}.`,
  `Follow the binding rules, the finding fields and your role's instructions in ${BRIEF}, read first, then the files it names. Return findings and the selected retains the brief defines; never edit any file. Every finding carries page (the filename) and a verbatim quote, and line from the Read tool when known.`,
].join('\n')

// The structural pass is one agent per page, each reviewing its page against the
// whole set: a whole-set structural agent in the finding form runs out of output
// before it can return, so the per-page results are merged below.
const structuralUnits = docs.map(d => ({ label: basename(d), path: d }))

// The reviewers are pinned to Opus so the session model is spent only on planning
// and triage: a 16-page set spawns 33 reviewers. The triage rubric was calibrated
// against findings from Fable reviewers; check calibration/score.json on the first
// triaged Opus run.
const REVIEWER_MODEL = 'opus'
phase('Review')
const results = await parallel([
  ...units.map(u => () => agent(
    `You are a drill reviewer in a fan-out editorial review.\n${common}\nYour assigned unit: ${u.label} in "${u.path}" - ${u.description}. Read every document whole for context, then review only this unit: on every paragraph, ask the drill questions the brief lists for this run's intent, in the brief's order. Gate scratch file: ${SCRATCH}/drill-${safeLabel(u.label)}.txt.`,
    { label: `drill:${u.label}`, phase: 'Review', schema: FINDINGS_SCHEMA, agentType: 'general-purpose', model: REVIEWER_MODEL },
  )),
  ...structuralUnits.map(u => () => agent(
    `You are a structural reviewer in a fan-out editorial review, assigned one page of the set.\n${common}\nYour assigned page: "${u.path}". Read every document whole for context, then apply the structural reviewer role in the brief to this page against the rest of the set: repetitions on this page whose home is elsewhere (one finding per occurrence, related naming the home), sections on this page in the wrong document or mode, headings, lists and tables on this page that do not match their content's job, cross-references on this page that do not resolve, contradictions between a statement on this page and another page, qualifications separated from their rules, and the brief's diagram look-for. Anchor every finding on this page. Cap: at most 12 findings and 6 redundancy entries, the most severe first. Gate scratch file: ${SCRATCH}/structural-${safeLabel(u.label)}.txt.`,
    { label: `structural:${u.label}`, phase: 'Review', schema: STRUCTURAL_SCHEMA, agentType: 'general-purpose', model: REVIEWER_MODEL, effort: 'high' },
  )),
  () => agent(
    `You are the cold editor in a fan-out editorial review.\n${common}\nApply the cold editor role in the brief across the whole document set: reading order, page openings and carried-away sentences, the page retains the brief defines, and set-wide patterns; nothing sentence-level inside one unit. Gate scratch file: ${SCRATCH}/editor-pass.txt.`,
    { label: 'editor-pass', phase: 'Review', schema: EDITOR_SCHEMA, agentType: 'general-purpose', model: REVIEWER_MODEL },
  ),
])

// Every reviewer must have returned. A reviewer the harness refused or dropped
// returns nothing, and an empty result in its place would make a review with
// no findings that the build accepts as complete. A valid empty result, from
// a reviewer that read the pages and found nothing, is a return.
const labels = [
  ...units.map(u => `drill:${u.label}`),
  ...structuralUnits.map(u => `structural:${u.label}`),
  'editor-pass',
]
const missing = labels.filter((l, i) => results[i] === null || results[i] === undefined)
if (missing.length) throw new Error(`the review is incomplete: no result from ${missing.join(', ')}; nothing is returned, because a review with a missing reviewer is not a review`)

const unitResults = results.slice(0, units.length).map((r, i) => ({
  unit: units[i].label,
  path: units[i].path,
  findings: r.findings,
  retains: r.retains,
}))
const structuralResults = results.slice(units.length, units.length + structuralUnits.length)
const structural = {
  findings: structuralResults.flatMap(r => r.findings),
  redundancies: structuralResults.flatMap(r => r.redundancies),
  pages: structuralResults.length,
}
const editorPass = results[units.length + structuralUnits.length]

const drillCount = unitResults.reduce((n, u) => n + u.findings.length, 0)
const retainCount = unitResults.reduce((n, u) => n + u.retains.length, 0)
  + editorPass.pages.reduce((n, p) => n + p.retains.length, 0)
const structuralCount = structural.findings.length + structural.redundancies.reduce((n, r) => n + r.occurrences.length, 0)
const editorCount = editorPass.pages.reduce((n, p) => n + p.findings.length, 0) + editorPass.order.length + editorPass.patterns.length
log(`Review complete (${mode}, ${intent}): ${drillCount} drill findings across ${units.length} units; structural ${structuralCount} findings; cold editor ${editorCount} findings; retains ${retainCount}`)

return {
  version: 3,
  mode,
  intent,
  sourceHashes,
  units: unitResults,
  structural,
  editorPass,
  hint: `Build the triage from this run: ${BUILD}`,
}
