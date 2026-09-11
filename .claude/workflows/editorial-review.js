export const meta = {
  name: 'editorial-review',
  description: 'Fan-out editorial review of a document or document set: per-unit drill reviewers, a structural pass and a cold editor pass; returns closable v2 findings and never edits',
  whenToUse: 'When the editorial skill reviews a whole document or a set of documents and the user asks for the workflow. Args: {docs: [paths]} or {sections: [{label, path, description}]}, frame (required reader frame), mode, notes. Build the result with build-triage.sh --from-run <run id>.',
  phases: [
    { title: 'Scope', detail: 'split a single document into review units' },
    { title: 'Review', detail: 'drill each unit; structural pass; cold editor pass' },
  ],
}

const BRIEF = '~/trade-imports-arch-workspace/.claude/skills/editorial/references/review-brief.md'
const SCRATCH = '~/trade-imports-arch-workspace/.claude/workareas/editorial/review'
const BUILD = 'bash ~/trade-imports-arch-workspace/.claude/tools/editorial-triage/build-triage.sh --from-run <run id from the Workflow tool result> --dir ~/trade-imports-arch-workspace/.claude/workareas/editorial-triage/<docset>-<date>'

// The harness has passed args as a JSON string before; accept both forms.
let input = args
if (typeof input === 'string') {
  try {
    input = JSON.parse(input)
  } catch (e) {
    throw new Error('args arrived as a string that is not JSON. Pass an object ({docs, frame, mode, notes}) as the Workflow args, or embed the inputs in a session copy of this script and run it with scriptPath.')
  }
}
if (!input || !input.frame) throw new Error('args.frame (the step-1 reader frame) is required')
const frame = input.frame
const mode = input.mode || 'explanation'
const notes = input.notes || 'none'

// One finding, in the record contract's reviewer-set fields
// (.claude/skills/editorial-triage/assets/editorial-triage-schema.md). The
// brief says what each field is for; build-triage.sh validates the values.
const ANCHOR = {
  type: 'object',
  required: ['page', 'quote'],
  properties: {
    page: { type: 'string', description: 'page filename' },
    line: { type: 'integer', description: 'line number from the Read tool' },
    quote: { type: 'string', description: 'verbatim phrase on that line' },
  },
}

const FINDING = {
  type: 'object',
  required: ['page', 'line', 'quote', 'kind', 'severity', 'defect', 'point', 'bearing', 'removes', 'action', 'basis'],
  properties: {
    page: { type: 'string', description: 'page filename, for example 03-ins-auth-session-record.md' },
    line: { type: 'integer', description: 'line number from the Read tool' },
    quote: { type: 'string', description: 'verbatim phrase on that line the finding anchors to' },
    kind: { type: 'string', enum: ['fact', 'citation', 'contradiction', 'absolute', 'omission', 'ambiguity', 'term', 'reference', 'repetition', 'compression', 'flow', 'residue'] },
    severity: { type: 'string', enum: ['S1', 'S2', 'S3', 'S4', 'S5'] },
    defect: { type: 'string', description: 'one sentence naming the defect and the question that exposed the defect' },
    point: { type: 'string', description: 'one sentence naming what the passage is trying to establish' },
    bearing: { type: 'string', enum: ['central', 'supporting', 'tangential'] },
    removes: { type: 'string', description: 'the smallest verbatim span whose removal resolves the finding, or "none: <why removal fails>"' },
    action: { type: 'string', enum: ['delete', 'shorten', 'correct', 'reconcile', 'rewrite', 'rename', 'split', 'move', 'restructure', 'expand', 'point', 'qualify', 'own', 'ask'] },
    basis: { type: 'string', enum: ['rule', 'source', 'set', 'inference', 'author'] },
    cites: { type: 'array', items: { type: 'string' }, description: 'the rule name; <NN> "<verbatim quote>" for set; the one step for inference' },
    before: { type: 'string', description: 'verbatim span the rewrite replaces; occurs once in the page' },
    after: { type: 'string', description: 'replacement text; empty for a deletion' },
    loss: { type: 'string', description: 'the wrong inference or unverifiable claim the reader is left with without the addition; required when after is longer than before' },
    question: { type: 'string', description: 'the precise question for the author; basis author only' },
    owner: { type: 'string', description: 'who answers the question' },
    related: { type: 'array', items: ANCHOR, description: 'the other statements in a cross-page defect; the other side of a contradiction' },
    moveTo: { type: 'string', description: 'target section or page for move and restructure' },
    guess: { type: 'boolean', description: 'true when the proposal supplies a mechanism, reason or fact the pages do not state' },
    status: { type: 'string', enum: ['broken', 'circular', 'unlocated'], description: 'for kind reference: how the cross-reference fails' },
  },
}

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: { type: 'array', items: FINDING },
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
    findings: { type: 'array', items: FINDING, description: 'structure, mode, cross-reference and cross-file findings' },
    redundancies: {
      type: 'array',
      items: {
        type: 'object',
        required: ['fact', 'home', 'occurrences'],
        properties: {
          fact: { type: 'string', description: 'the repeated fact, rule or argument in one sentence' },
          home: ANCHOR,
          occurrences: { type: 'array', items: FINDING, description: 'one repetition finding per occurrence outside the home' },
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
        required: ['page', 'verdict', 'opening', 'carriedAway', 'findings'],
        properties: {
          page: { type: 'string', description: 'page filename' },
          verdict: { type: 'string', enum: ['finishes', 'stalls', 'misleads'] },
          opening: { type: 'string', description: 'what the opening does for the framed reader, in one sentence' },
          carriedAway: { type: 'string', description: 'the one sentence the framed reader carries away' },
          findings: { type: 'array', items: FINDING, description: 'at most two, about the opening or the page as a whole' },
        },
      },
    },
    order: { type: 'array', items: FINDING, description: 'a term or fact met before its introduction; related names the introduction' },
    patterns: {
      type: 'array',
      items: {
        type: 'object',
        required: ['pattern', 'instances', 'finding'],
        properties: {
          pattern: { type: 'string', description: 'the set-wide pattern in one sentence' },
          instances: { type: 'array', items: ANCHOR, description: 'every instance, three or more' },
          finding: FINDING,
        },
      },
    },
  },
}

const safeLabel = s => s.replace(/[^A-Za-z0-9._-]/g, '-')

// Resolve the review units: explicit sections beat docs; several docs mean one unit per file;
// a single doc is split by a scope agent.
let units = []
if (input.sections && input.sections.length) {
  units = input.sections
} else if (input.docs && input.docs.length > 1) {
  units = input.docs.map(d => ({ label: d.split('/').pop(), path: d, description: 'the whole file' }))
} else if (input.docs && input.docs.length === 1) {
  phase('Scope')
  const doc = input.docs[0]
  const split = await agent(
    `Read the document at "${doc}" (use the Read tool; quote the path). Split it into review units for a fan-out editorial review: group by heading, merge small neighbouring sections so each unit is substantial, and return at most 6 units. Each unit needs a short label and a description naming the headings it covers. Do not review anything; return only the split.`,
    { label: 'scope', schema: SECTIONS_SCHEMA, agentType: 'general-purpose' },
  )
  units = split.sections.map(s => ({ label: s.label, path: doc, description: s.description }))
} else {
  throw new Error('args.docs (array of paths) or args.sections (array of {label, path, description}) is required')
}

const docs = input.docs || [...new Set(units.map(u => u.path))]
const docsQuoted = docs.map(d => `"${d}"`).join(', ')

const common = [
  `Reader frame (the lens for every finding): ${frame}`,
  `Document mode: ${mode}`,
  `Run notes: ${notes}`,
  `Standing rules: closing moves only (every finding names the span that goes first); no fact-checking against the world, only contradictions inside the set; pointers and cross-references are removal candidates.`,
  `Documents under review, in reading order: ${docsQuoted}.`,
  `Follow the binding rules, the finding fields and your role's instructions in ${BRIEF} - read it first, then the files it names. Findings only; never edit any file. Every finding carries page (the filename), line (from the Read tool) and a verbatim quote.`,
].join('\n')

// The structural pass is one agent per page, each reviewing its page against the
// whole set: a whole-set structural agent in the v2 finding form runs out of output
// before it can return, so the per-page results are merged below.
const structuralUnits = docs.map(d => ({ label: d.split('/').pop(), path: d }))

phase('Review')
const results = await parallel([
  ...units.map(u => () => agent(
    `You are a drill reviewer in a fan-out editorial review.\n${common}\nYour assigned unit: ${u.label} in "${u.path}" - ${u.description}. Read every document whole for context, then review only this unit. Gate scratch file: ${SCRATCH}/drill-${safeLabel(u.label)}.txt.`,
    { label: `drill:${u.label}`, phase: 'Review', schema: FINDINGS_SCHEMA, agentType: 'general-purpose' },
  )),
  ...structuralUnits.map(u => () => agent(
    `You are a structural reviewer in a fan-out editorial review, assigned one page of the set.\n${common}\nYour assigned page: "${u.path}". Read every document whole for context, then apply the structural reviewer role in the brief to this page against the rest of the set: repetitions on this page whose home is elsewhere (one finding per occurrence, related naming the home), sections on this page in the wrong document or mode, headings, lists and tables on this page that do not match their content's job, cross-references on this page that do not resolve, contradictions between a statement on this page and another page, and qualifications separated from their rules. Anchor every finding on this page. Cap: at most 12 findings and 6 redundancy entries, the most severe first. Gate scratch file: ${SCRATCH}/structural-${safeLabel(u.label)}.txt.`,
    { label: `structural:${u.label}`, phase: 'Review', schema: STRUCTURAL_SCHEMA, agentType: 'general-purpose', effort: 'high' },
  )),
  () => agent(
    `You are the cold editor in a fan-out editorial review.\n${common}\nApply the cold editor role in the brief across the whole document set: reading order, page openings and carried-away sentences, and set-wide patterns; nothing sentence-level inside one unit. Gate scratch file: ${SCRATCH}/editor-pass.txt.`,
    { label: 'editor-pass', phase: 'Review', schema: EDITOR_SCHEMA, agentType: 'general-purpose' },
  ),
])

const unitResults = results.slice(0, units.length).map((r, i) => ({
  unit: units[i].label,
  path: units[i].path,
  findings: (r && r.findings) || [],
}))
const structuralResults = results.slice(units.length, units.length + structuralUnits.length).filter(Boolean)
const structural = structuralResults.length
  ? {
      findings: structuralResults.flatMap(r => r.findings || []),
      redundancies: structuralResults.flatMap(r => r.redundancies || []),
      pages: structuralResults.length,
    }
  : null
const editorPass = results[units.length + structuralUnits.length] || null

const drillCount = unitResults.reduce((n, u) => n + u.findings.length, 0)
const structuralCount = structural
  ? (structural.findings || []).length + (structural.redundancies || []).reduce((n, r) => n + (r.occurrences || []).length, 0)
  : 0
const editorCount = editorPass
  ? (editorPass.pages || []).reduce((n, p) => n + (p.findings || []).length, 0) + (editorPass.order || []).length + (editorPass.patterns || []).length
  : 0
log(`Review complete: ${drillCount} drill findings across ${units.length} units; structural ${structural ? structuralCount + ' findings' : 'missing'}; cold editor ${editorPass ? editorCount + ' findings' : 'missing'}`)

return {
  version: 2,
  units: unitResults,
  structural,
  editorPass,
  hint: `Build the triage from this run: ${BUILD}`,
}
