export const meta = {
  name: 'editorial-triage',
  description: 'Editorial triage steps 2 to 6: build, verify claims, rebuild, grade, score and plan, ending at the spot check',
  whenToUse: 'Launched by the editorial-triage skill after Step 1; the skill shows the spot check and runs apply',
  phases: [
    { title: 'Build', detail: 'runner runs build-triage.sh' },
    { title: 'Verify', detail: 'one claim verifier per page the build names, one retry' },
    { title: 'Grade', detail: 'one grader per page, plus one for set-wide clusters' },
    { title: 'Plan', detail: 'runner scores and plans with a spot check' },
  ],
}

// args: {run: review run id or result path | review: findings directory, workarea: ~ path, commit: label,
//        sample?: spot-check size, seed?: plan seed}
const input = typeof args === 'string' ? JSON.parse(args) : args
if (!input || !(input.run || input.review) || !input.workarea) throw new Error('args needs run or review, workarea and commit')
const WA = input.workarea.replace(/\/$/, '')
const TOOLS = '~/trade-imports-arch-workspace/.claude/tools/editorial-triage'
const REFS = '~/trade-imports-arch-workspace/.claude/skills/editorial-triage/references'
const SOURCE = input.run ? `--from-run ${input.run}` : `--from-review ${input.review}`
const BUILD = `bash ${TOOLS}/build-triage.sh ${SOURCE} --dir ${WA} --commit ${input.commit || 'unknown'}`
const PAGES = `jq -r '.pages[] | "page: \\(.page) \\(.path) \\(.hash)"' ${WA}/manifest.json`
const CLUSTERS = `jq -r '.clusters | group_by(.page)[] | "clusters: \\(.[0].page) \\(length)"' ${WA}/triage.json`
// Mechanical steps run on a cheap runner: the scripts do the work, the runner only relays their lines.
const RUNNER = { agentType: 'general-purpose', model: 'sonnet', effort: 'low' }
const LINES = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, lines: { type: 'array', items: { type: 'string' } } },
  required: ['ok', 'lines'],
}
const run = (cmd, label, phaseTitle) => agent(
  `Run exactly this command with the Bash tool, as one call, and return its output lines (every line beginning with build-triage:, score:, plan:, page: or clusters:, or the last 40 lines when none do). Set ok to false when the command exits non-zero. Do not read, open or change any other file.\n\n${cmd}`,
  { label, phase: phaseTitle, schema: LINES, ...RUNNER },
)
const must = (res, what) => {
  if (!res || !res.ok) throw new Error(`${what} failed: ${(res && res.lines || []).join(' | ')}`)
  return res.lines
}
const tilde = p => p.replace(/^\/Users\/[^/]+\//, '~/')
const toVerify = lines => {
  const m = lines.map(l => l.match(/spawn CLAIM_VERIFIER for: (.*)$/)).find(Boolean)
  return m ? m[1].split(/\s+/).filter(p => /\.md$/.test(p)) : []
}
const verificationLine = lines => lines.find(l => /verification: files read/.test(l)) || ''

phase('Build')
const built = must(await run(`${BUILD} ; ${PAGES}`, 'build', 'Build'), 'build')
const pages = {}
for (const l of built) {
  const m = l.match(/^page: (\S+) (\S+) (\S+)$/)
  if (m) pages[m[1]] = { page: m[1], path: tilde(m[2]), hash: m[3] }
}
if (!Object.keys(pages).length) throw new Error(`build listed no pages: ${built.slice(-5).join(' | ')}`)

phase('Verify')
const verify = names => parallel(names.filter(n => pages[n]).map(n => () => agent(
  `Follow the instructions in ${REFS}/CLAIM_VERIFIER.md.\n\n**Workarea:** ${WA}/\n**Page:** ${n}\n**Page path:** ${pages[n].path}\n**Source hash:** ${pages[n].hash}\n\nYour final text is your one-line return.`,
  { label: `verify:${n}`, phase: 'Verify', agentType: 'general-purpose' },
)))
let pending = toVerify(built)
const verifiers = []
let rebuilt = built
let verification = verificationLine(built)
// One retry: a page the rebuild still names gets a second verifier; a third naming goes to the user.
for (let attempt = 1; attempt <= 2 && pending.length; attempt++) {
  verifiers.push(...(await verify(pending)))
  rebuilt = must(await run(`${BUILD} ; ${CLUSTERS}`, attempt === 1 ? 'rebuild' : 'rebuild-retry', 'Verify'), 'rebuild')
  pending = toVerify(rebuilt)
  verification = verificationLine(rebuilt)
  if (pending.length) log(`rebuild still names pages to verify: ${pending.join(' ')}`)
}
if (pending.length) {
  return { stopped: 'verification', pending, verification, verifiers, lines: rebuilt }
}
if (rebuilt === built) rebuilt = must(await run(CLUSTERS, 'clusters', 'Verify'), 'cluster count')

phase('Grade')
const clusterCounts = {}
for (const l of rebuilt) {
  const m = l.match(/^clusters: (\S+) (\d+)$/)
  if (m) clusterCounts[m[1]] = Number(m[2])
}
const items = Object.keys(clusterCounts).filter(p => p === 'set' || pages[p])
const graders = await parallel(items.map(p => () => agent(
  `Follow the instructions in ${REFS}/GRADER.md.\n\n**Workarea:** ${WA}/\n**Items:** ${p}\n**Mode:** seen\n**Round:** none\n**Output name:** ${p.replace(/\.md$/, '')}\n\nYour final text is your one-line return.`,
  { label: `grade:${p}`, phase: 'Grade', agentType: 'general-purpose' },
)))
// A grader that died leaves its clusters ungraded; planning them would only list them as problems.
const failed = items.filter((p, i) => !graders[i])
if (failed.length) {
  return { stopped: 'grading', failed, verification, verifiers, clusters: clusterCounts, graders }
}
const short = items.filter((p, i) => {
  const m = (graders[i] || '').match(/graded (\d+)/)
  return !m || Number(m[1]) !== clusterCounts[p]
})
if (short.length) log(`grader counts differ from the cluster counts for: ${short.join(' ')}`)

phase('Plan')
const planCmd = `bash ${TOOLS}/grade-triage.sh score --dir ${WA} ; bash ${TOOLS}/grade-triage.sh plan --dir ${WA} --sample ${input.sample || 10}${input.seed ? ` --seed ${input.seed}` : ''}`
const planned = must(await run(planCmd, 'score-and-plan', 'Plan'), 'score and plan')

return {
  stopped: null,
  plan: `${WA}/closing/plan.md`,
  build: built.filter(l => /records|clusters|claims:|spawn/.test(l)),
  verification,
  verifiers,
  clusters: clusterCounts,
  graders,
  gradeCountMismatch: short,
  score: planned.filter(l => /^score:/.test(l)),
  planLines: planned.filter(l => /^plan:/.test(l)),
}
