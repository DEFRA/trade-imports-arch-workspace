export const meta = {
  name: 'editorial-triage-exp',
  description: 'Experiment X9: the editorial triage as a workflow, so the main session launches it and reads the result instead of driving each step',
  phases: [
    { title: 'Build', detail: 'runner runs build-triage.sh' },
    { title: 'Verify', detail: 'one claim verifier per page' },
    { title: 'Rebuild', detail: 'runner rebuilds with the verdicts' },
    { title: 'Grade', detail: 'one grader per page' },
    { title: 'Close', detail: 'runner scores, plans and applies (dry run unless told)' },
  ],
}

// args: {run (review run id or result file), workarea (~ path), commit, pages: [{page, path, hash}], applyForReal: bool}
const input = typeof args === 'string' ? JSON.parse(args) : args
if (!input || !input.run || !input.workarea || !Array.isArray(input.pages) || !input.pages.length) {
  throw new Error('args needs run, workarea, commit and pages [{page, path, hash}]')
}
const TOOLS = '~/trade-imports-arch-workspace/.claude/tools/editorial-triage'
const REFS = '~/trade-imports-arch-workspace/.claude/skills/editorial-triage/references'
const BUILD = `bash ${TOOLS}/build-triage.sh --from-run ${input.run} --dir ${input.workarea} --commit ${input.commit || 'unknown'}`
const RUNNER = { agentType: 'general-purpose', model: 'sonnet', effort: 'low' }
const LINES = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, lines: { type: 'array', items: { type: 'string' } } },
  required: ['ok', 'lines'],
}
const runCmd = (cmd, label, phaseTitle) => agent(
  `Run exactly this command with the Bash tool, as one call, and return its output lines (every line beginning with build-triage:, score:, plan: or apply:, or the last 40 lines when none do). Set ok to false when the command exits non-zero. Do not read, open or change any other file.\n\n${cmd}`,
  { label, phase: phaseTitle, schema: LINES, ...RUNNER },
)

phase('Build')
const built = await runCmd(BUILD, 'build', 'Build')
if (!built || !built.ok) throw new Error(`build failed: ${(built && built.lines || []).join(' | ')}`)

phase('Verify')
const verified = await parallel(input.pages.map(p => () => agent(
  `Follow the instructions in ${REFS}/CLAIM_VERIFIER.md.\n\n**Workarea:** ${input.workarea}/\n**Page:** ${p.page}\n**Page path:** ${p.path}\n**Source hash:** ${p.hash}\n\nYour final text is your one-line return.`,
  { label: `verify:${p.page}`, phase: 'Verify', agentType: 'general-purpose' },
)))
log(`verifiers returned: ${verified.filter(Boolean).length} of ${input.pages.length}`)

phase('Rebuild')
const rebuilt = await runCmd(BUILD, 'rebuild', 'Rebuild')
if (!rebuilt || !rebuilt.ok) throw new Error(`rebuild failed: ${(rebuilt && rebuilt.lines || []).join(' | ')}`)
const rejected = rebuilt.lines.filter(l => /rejected [1-9]|ignored [1-9]|spawn CLAIM_VERIFIER/.test(l))
if (rejected.length) log(`rebuild reports verification problems: ${rejected.join(' | ')}`)

phase('Grade')
const graded = await parallel(input.pages.map(p => () => agent(
  `Follow the instructions in ${REFS}/GRADER.md.\n\n**Workarea:** ${input.workarea}/\n**Items:** ${p.page}\n**Mode:** seen\n**Round:** none\n**Output name:** ${p.page.replace(/\.md$/, '')}\n\nYour final text is your one-line return.`,
  { label: `grade:${p.page}`, phase: 'Grade', agentType: 'general-purpose' },
)))
log(`graders returned: ${graded.filter(Boolean).length} of ${input.pages.length}`)

phase('Close')
const applyFlag = input.applyForReal ? '--force' : '--dry-run'
const closed = await runCmd(
  `bash ${TOOLS}/grade-triage.sh score --dir ${input.workarea} ; bash ${TOOLS}/grade-triage.sh plan --dir ${input.workarea} --sample 10 ; bash ${TOOLS}/grade-triage.sh apply --dir ${input.workarea} ${applyFlag}`,
  'close', 'Close',
)

return {
  build: built.lines.filter(l => /records|clusters|claims:|spawn/.test(l)),
  verifiers: verified,
  rebuild: rebuilt.lines.filter(l => /claims:|verification/.test(l)),
  graders: graded,
  close: closed ? closed.lines.filter(l => /plan: [0-9]+ clusters|apply: [0-9]+ entries|selected/.test(l)) : null,
}
