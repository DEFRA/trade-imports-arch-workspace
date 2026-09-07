export const meta = {
  name: 'editorial-review',
  description: 'Fan-out editorial review of a document or document set: per-unit drill reviewers, a structural pass and a cold editor pass; returns consolidated findings and never edits',
  whenToUse: 'When the editorial skill reviews a whole document or a set of documents and the user asks for the workflow. Args: {docs: [paths]} or {sections: [{label, path, description}]}, frame (required reader frame), mode, notes.',
  phases: [
    { title: 'Scope', detail: 'split a single document into review units' },
    { title: 'Review', detail: 'drill each unit; structural pass; cold editor pass' },
  ],
}

const BRIEF = '~/trade-imports-arch-workspace/.claude/skills/editorial/references/review-brief.md'

if (!args || !args.frame) throw new Error('args.frame (the step-1 reader frame) is required')
const frame = args.frame
const mode = args.mode || 'explanation'
const notes = args.notes || 'none'

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['location', 'category', 'defect'],
        properties: {
          location: { type: 'string', description: 'quoted phrase or heading' },
          category: { type: 'string', enum: ['drill', 'jargon', 'verifiability', 'circularity', 'boundary', 'repetition', 'compression', 'flow', 'residue'] },
          defect: { type: 'string', description: 'what is wrong and the drill question that exposed it' },
          proposal: { type: 'string', description: 'proposed rewrite, gated through check-prose.sh' },
          question: { type: 'string', description: 'named gap for the author, when a rewrite would be invention' },
        },
      },
    },
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
  required: ['redundancies', 'structure', 'crossReferences', 'shapes'],
  properties: {
    redundancies: {
      type: 'array',
      items: {
        type: 'object',
        required: ['fact', 'homes', 'judgment', 'proposal'],
        properties: {
          fact: { type: 'string' },
          homes: { type: 'string', description: 'each location, briefly quoted' },
          judgment: { type: 'string', description: 'legitimate rule-plus-example OR duplication' },
          proposal: { type: 'string', description: 'single home and what the other occurrences become' },
        },
      },
    },
    structure: { type: 'array', items: { type: 'string' } },
    crossReferences: { type: 'array', items: { type: 'string' } },
    shapes: { type: 'array', items: { type: 'string' } },
  },
}

// Resolve the review units: explicit sections beat docs; several docs mean one unit per file;
// a single doc is split by a scope agent.
let units = []
if (args.sections && args.sections.length) {
  units = args.sections
} else if (args.docs && args.docs.length > 1) {
  units = args.docs.map(d => ({ label: d.split('/').pop(), path: d, description: 'the whole file' }))
} else if (args.docs && args.docs.length === 1) {
  phase('Scope')
  const doc = args.docs[0]
  const split = await agent(
    `Read the document at "${doc}" (use the Read tool; quote the path). Split it into review units for a fan-out editorial review: group by heading, merge small neighbouring sections so each unit is substantial, and return at most 6 units. Each unit needs a short label and a description naming the headings it covers. Do not review anything; return only the split.`,
    { label: 'scope', schema: SECTIONS_SCHEMA, agentType: 'general-purpose' },
  )
  units = split.sections.map(s => ({ label: s.label, path: doc, description: s.description }))
} else {
  throw new Error('args.docs (array of paths) or args.sections (array of {label, path, description}) is required')
}

const docs = args.docs || [...new Set(units.map(u => u.path))]
const docsQuoted = docs.map(d => `"${d}"`).join(', ')

const common = [
  `Reader frame (the lens for every finding): ${frame}`,
  `Document mode: ${mode}`,
  `Run notes: ${notes}`,
  `Documents under review: ${docsQuoted}.`,
  `Follow the binding rules and your role's instructions in ${BRIEF} - read it first, then the files it names. Findings only; never edit any file.`,
].join('\n')

phase('Review')
const results = await parallel([
  ...units.map(u => () => agent(
    `You are a drill reviewer in a fan-out editorial review.\n${common}\nYour assigned unit: ${u.label} in "${u.path}" - ${u.description}. Read every document whole for context, then review only this unit. Gate your proposals with the check-prose command the brief names, using --label ${u.label.replace(/[^A-Za-z0-9._-]/g, '-')}.`,
    { label: `drill:${u.label}`, phase: 'Review', schema: FINDINGS_SCHEMA, agentType: 'general-purpose' },
  )),
  () => agent(
    `You are the structural reviewer in a fan-out editorial review.\n${common}\nApply the structural reviewer role in the brief across the whole document set.`,
    { label: 'structural', phase: 'Review', schema: STRUCTURAL_SCHEMA, agentType: 'general-purpose' },
  ),
  () => agent(
    `You are the cold editor in a fan-out editorial review.\n${common}\nApply the cold editor role in the brief across the whole document set. Return numbered findings only.`,
    { label: 'editor-pass', phase: 'Review', agentType: 'general-purpose' },
  ),
])

const unitResults = results.slice(0, units.length).map((r, i) => ({
  unit: units[i].label,
  path: units[i].path,
  findings: (r && r.findings) || [],
}))
const structural = results[units.length] || null
const editorPass = results[units.length + 1] || null

const totalFindings = unitResults.reduce((n, u) => n + u.findings.length, 0)
log(`Review complete: ${totalFindings} drill findings across ${units.length} units; structural ${structural ? 'returned' : 'missing'}; editor pass ${editorPass ? 'returned' : 'missing'}`)

return { units: unitResults, structural, editorPass }
